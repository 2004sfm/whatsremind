use crate::error::AppError;
use crate::models::ExcelPreview;
use calamine::{open_workbook_auto, Reader};
use std::path::Path;

pub fn normalize_phone(raw: &str) -> (String, bool) {
    let mut cleaned: String = raw
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '-')
        .collect();

    if cleaned.is_empty() {
        return ("".to_string(), false);
    }

    // Pre-procesador para corregir Excels donde omiten el '+'
    // En Venezuela, un número local con '0' (ej. 0414...) tiene 11 dígitos.
    // Si tiene 11 dígitos o más y NO empieza con '0', es estadísticamente un código de país (ej. 573, 584, 130)
    if !cleaned.starts_with('+') && cleaned.len() >= 11 && !cleaned.starts_with('0') {
        cleaned = format!("+{}", cleaned);
    }

    match phonenumber::parse(Some(phonenumber::country::Id::VE), &cleaned) {
        Ok(number) => {
            if phonenumber::is_valid(&number) {
                (number.format().mode(phonenumber::Mode::E164).to_string(), true)
            } else {
                // If it's technically invalid but they typed something, keep it for display but don't send
                (cleaned, false)
            }
        }
        Err(_) => {
            // Unparseable
            (cleaned, false)
        }
    }
}

pub fn preview_excel_file<P: AsRef<Path>>(path: P, selected_sheet: Option<String>) -> Result<ExcelPreview, AppError> {
    let mut workbook = open_workbook_auto(path).map_err(|e| AppError::Io(e.to_string()))?;
    
    let sheet_names = workbook.sheet_names().to_owned();
    if sheet_names.is_empty() {
        return Err(AppError::Validation("No sheets found in Excel file".to_string()));
    }

    let target_sheet = if let Some(s) = selected_sheet {
        if !sheet_names.contains(&s) {
            return Err(AppError::Validation(format!("Sheet '{}' not found", s)));
        }
        s
    } else {
        let mut best = sheet_names[0].clone();
        let mut max_rows = 0;
        for name in &sheet_names {
            if let Ok(range) = workbook.worksheet_range(name) {
                let rows = range.rows().count();
                if rows > max_rows {
                    max_rows = rows;
                    best = name.clone();
                }
            }
        }
        best
    };

    let range = workbook
        .worksheet_range(&target_sheet)
        .map_err(|e| AppError::Io(e.to_string()))?;

    let header_idx = find_header_row_index(&range);
    let mut rows_iter = range.rows().skip(header_idx);
    
    let headers = if let Some(header_row) = rows_iter.next() {
        let mut raw_headers: Vec<String> = header_row.iter().map(cell_to_string).collect();
        let mut seen = std::collections::HashSet::new();
        for i in 0..raw_headers.len() {
            let h = raw_headers[i].trim();
            let base = if h.is_empty() { format!("Columna {}", i + 1) } else { h.to_string() };
            let mut final_name = base.clone();
            let mut count = 1;
            while seen.contains(&final_name) {
                count += 1;
                final_name = format!("{} ({})", base, count);
            }
            seen.insert(final_name.clone());
            raw_headers[i] = final_name;
        }
        raw_headers
    } else {
        vec![]
    };

    let mut preview_rows = Vec::new();
    for row in rows_iter.take(10) { // preview first 10 rows
        let row_data: Vec<String> = row.iter().map(cell_to_string).collect();
        preview_rows.push(row_data);
    }

    let total_rows = range.rows().count();

    Ok(ExcelPreview {
        headers,
        rows: preview_rows,
        total_rows: total_rows.saturating_sub(header_idx + 1), // excluding headers and rows above
        sheets: sheet_names,
        current_sheet: target_sheet,
    })
}

pub fn extract_all_rows<P: AsRef<Path>>(path: P, selected_sheet: Option<String>) -> Result<Vec<Vec<String>>, AppError> {
    let mut workbook = open_workbook_auto(path).map_err(|e| AppError::Io(e.to_string()))?;
    
    let sheet_names = workbook.sheet_names().to_owned();
    if sheet_names.is_empty() {
        return Err(AppError::Validation("No sheets found in Excel file".to_string()));
    }

    let target_sheet = if let Some(s) = selected_sheet {
        if !sheet_names.contains(&s) {
            return Err(AppError::Validation(format!("Sheet '{}' not found", s)));
        }
        s
    } else {
        let mut best = sheet_names[0].clone();
        let mut max_rows = 0;
        for name in &sheet_names {
            if let Ok(range) = workbook.worksheet_range(name) {
                let rows = range.rows().count();
                if rows > max_rows {
                    max_rows = rows;
                    best = name.clone();
                }
            }
        }
        best
    };

    let range = workbook
        .worksheet_range(&target_sheet)
        .map_err(|e| AppError::Io(e.to_string()))?;

    let header_idx = find_header_row_index(&range);
    let rows_iter = range.rows().skip(header_idx + 1);

    let mut data = Vec::new();
    for row in rows_iter {
        let row_data: Vec<String> = row.iter().map(cell_to_string).collect();
        data.push(row_data);
    }

    Ok(data)
}

pub fn extract_all_sheets_rows<P: AsRef<Path>>(path: P) -> Result<Vec<(String, Vec<(usize, Vec<String>)>)>, AppError> {
    let mut workbook = open_workbook_auto(path).map_err(|e| AppError::Io(e.to_string()))?;
    
    let sheet_names = workbook.sheet_names().to_owned();
    if sheet_names.is_empty() {
        return Err(AppError::Validation("No sheets found in Excel file".to_string()));
    }

    let mut result = Vec::new();

    for sheet_name in sheet_names {
        if let Ok(range) = workbook.worksheet_range(&sheet_name) {
            let header_idx = find_header_row_index(&range);
            let rows_iter = range.rows().skip(header_idx + 1);

            let mut data = Vec::new();
            let mut current_row = header_idx + 2; // header_idx is 0-indexed, plus 1 for header row itself, plus 1 for humans (1-based index)
            for row in rows_iter {
                let row_data: Vec<String> = row.iter().map(cell_to_string).collect();
                data.push((current_row, row_data));
                current_row += 1;
            }
            result.push((sheet_name, data));
        }
    }

    Ok(result)
}

fn cell_to_string(cell: &calamine::Data) -> String {
    match cell {
        calamine::Data::String(s) => s.to_string(),
        calamine::Data::Float(f) => f.to_string(),
        calamine::Data::Int(i) => i.to_string(),
        calamine::Data::Bool(b) => b.to_string(),
        calamine::Data::Empty => String::new(),
        calamine::Data::Error(_) => String::new(),
        calamine::Data::DateTime(d) => d.to_string(),
        calamine::Data::DateTimeIso(d) => d.to_string(),
        calamine::Data::DurationIso(d) => d.to_string(),
    }
}

fn find_header_row_index(range: &calamine::Range<calamine::Data>) -> usize {
    let mut best_index = 0;
    let mut max_score = -1;

    let keywords = [
        vec!["apto", "apartamento", "casa", "villa", "codigo", "unidad", "inmueble"],
        vec!["nombre", "propietario", "inquilino", "cliente", "titular", "nombres"],
        vec!["telefono", "celular", "whatsapp", "contacto", "tlf", "numero"],
        vec!["deuda", "saldo", "monto", "pagar", "total"],
    ];

    for (i, row) in range.rows().enumerate().take(20) {
        let mut keyword_score = 0;
        let mut families_found = vec![false; keywords.len()];

        let mut non_empty_count = 0;

        for cell in row.iter() {
            let is_empty = match cell {
                calamine::Data::Empty => true,
                calamine::Data::String(s) if s.trim().is_empty() => true,
                calamine::Data::Error(_) => true,
                _ => false,
            };

            if !is_empty {
                non_empty_count += 1;
                
                let s_lower = cell_to_string(cell).trim().to_lowercase();
                for (family_idx, family) in keywords.iter().enumerate() {
                    if !families_found[family_idx] && family.iter().any(|&k| s_lower.contains(k)) {
                        families_found[family_idx] = true;
                        keyword_score += 1;
                    }
                }
            }
        }

        // Puntaje dominado por palabras clave. Si hay empate de palabras clave,
        // desempata la fila con más columnas llenas (fallback automático viejo).
        let final_score = (keyword_score * 100) + non_empty_count;

        if final_score > max_score {
            max_score = final_score;
            best_index = i;
        }
    }
    best_index
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_phone() {
        // existing country code
        assert_eq!(normalize_phone("+584248195886"), ("+584248195886".to_string(), true));
        // 04xx prefix
        assert_eq!(normalize_phone("04248195886"), ("+584248195886".to_string(), true));
        // spaces and dashes
        assert_eq!(normalize_phone("0424-819 5886"), ("+584248195886".to_string(), true));
        // no country code, no zero
        assert_eq!(normalize_phone("4248195886"), ("+584248195886".to_string(), true));
        // malformed (letters)
        assert_eq!(normalize_phone("0424ABC5886"), ("+58424ABC5886".to_string(), false));
        // malformed (too short)
        assert_eq!(normalize_phone("123"), ("+58123".to_string(), false));
        // empty string
        assert_eq!(normalize_phone(""), ("+58".to_string(), false));
    }
}
