use rand::Rng;

pub fn parse_spintax(input: &str) -> String {
    let mut result = input.to_string();

    loop {
        // Find the innermost spintax block
        let mut start_idx = None;
        let mut end_idx = None;

        // Scan the string to find the innermost { ... }
        for (i, c) in result.char_indices() {
            if c == '{' {
                start_idx = Some(i);
            } else if c == '}' && start_idx.is_some() {
                end_idx = Some(i);
                break; // Found the innermost closing brace
            }
        }

        match (start_idx, end_idx) {
            (Some(start), Some(end)) => {
                let inner = &result[start + 1..end];
                let choices: Vec<&str> = inner.split('|').collect();
                let mut rng = rand::thread_rng();
                let selected = choices[rng.gen_range(0..choices.len())];

                // Replace the block { ... } with the selected string
                let mut new_result = String::new();
                new_result.push_str(&result[..start]);
                new_result.push_str(selected);
                new_result.push_str(&result[end + 1..]);
                result = new_result;
            }
            _ => {
                // No more complete { ... } blocks found
                break;
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_spintax() {
        let input = "{a|b}";
        let output = parse_spintax(input);
        assert!(output == "a" || output == "b");
    }

    #[test]
    fn test_nested_spintax() {
        let input = "{a|{b|c}}";
        let mut a_count = 0;
        let mut b_count = 0;
        let mut c_count = 0;
        for _ in 0..100 {
            let output = parse_spintax(input);
            match output.as_str() {
                "a" => a_count += 1,
                "b" => b_count += 1,
                "c" => c_count += 1,
                _ => panic!("Unexpected output: {}", output),
            }
        }
        assert!(a_count > 0 && b_count > 0 && c_count > 0);
    }

    #[test]
    fn test_empty_spintax() {
        let input = "{}";
        assert_eq!(parse_spintax(input), "");
    }

    #[test]
    fn test_single_option() {
        let input = "{single}";
        assert_eq!(parse_spintax(input), "single");
    }

    #[test]
    fn test_unmatched_braces() {
        assert_eq!(parse_spintax("a {b c"), "a {b c");
        assert_eq!(parse_spintax("a b} c"), "a b} c");
    }

    #[test]
    fn test_multiple_blocks() {
        let input = "{a|b} and {c|d}";
        let output = parse_spintax(input);
        assert!(output == "a and c" || output == "a and d" || output == "b and c" || output == "b and d");
    }
}
