#!/usr/bin/env bash

# Directorios base de los agentes
AGENT_ROOTS=(".claude" ".gemini" ".github" ".codex" ".agents")

echo "Iniciando sincronización por Symlinks..."

# Aseguramos que la carpeta .agents exista porque es el estándar obligatorio para Antigravity en este workspace
mkdir -p .agents/skills

for root_dir in "${AGENT_ROOTS[@]}"; do
  if [ -d "$root_dir" ] || [ "$root_dir" == ".agents" ]; then
    target="$root_dir/skills"
    mkdir -p "$target"
    
    for skill in skills/*/; do
      if [ -d "$skill" ]; then
        skill_name=$(basename "$skill")
        
        if [ "$skill_name" != "skill-sync" ]; then
          ln -sfn "../../skills/$skill_name" "$target/$skill_name"
          echo "✅ Symlink creado: $target/$skill_name -> ../../skills/$skill_name"
        fi
      fi
    done
  fi
done

echo "¡Sincronización completa!"
