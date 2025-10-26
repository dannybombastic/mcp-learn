# MCP Learn Catalog Server 📚

Un servidor MCP (Model Context Protocol) para extraer y procesar contenido de Microsoft Learn. Permite acceder a catálogos de certificaciones, módulos de aprendizaje y extraer contenido completo de las unidades de estudio.

## 🚀 Características

- **Búsqueda de catálogo**: Busca módulos, certificaciones, learning paths y más en Microsoft Learn
- **Extracción de contenido**: Extrae contenido completo de módulos incluyendo tablas, diagramas y texto técnico
- **Scraping inteligente**: Construye URLs automáticamente y extrae contenido estructurado
- **Soporte para certificaciones**: Optimizado para certificaciones como AZ-104, AZ-900, etc.
- **API de Microsoft Learn**: Integración directa con la API oficial de Microsoft Learn

## 🛠️ Herramientas Disponibles

### 1. `listCatalog`
Lista objetos de Microsoft Learn por tipo.

**Parámetros:**
- `type`: Tipo de contenido (modules, certifications, learningPaths, etc.)
- `locale`: Idioma (por defecto: en-us)
- `max_results`: Máximo número de resultados

### 2. `searchCatalog`
Busca en el catálogo de Microsoft Learn con filtros avanzados.

**Parámetros:**
- `q`: Texto de búsqueda libre
- `type`: Tipos de contenido separados por comas
- `level`: Niveles (beginner, intermediate, advanced)
- `product`: Productos específicos
- `role`: Roles específicos

### 3. `getDetail`
Obtiene detalles completos de objetos por UID.

**Parámetros:**
- `uid`: UIDs separados por comas
- `locale`: Idioma
- `type`: Filtro opcional por tipo

### 4. `scrapeModuleUnits` ⭐
**Herramienta principal**: Extrae contenido completo de módulos de Microsoft Learn.

**Parámetros:**
- `module`: Objeto de módulo con UID, firstUnitUrl y units
- `firstUnitUrl`: URL de la primera unidad (alternativa)
- `units`: Array de UIDs de unidades (alternativa)
- `max_chars_excerpt`: Máximo de caracteres por unidad (por defecto: 20,000)
- `max_units`: Máximo número de unidades
- `with_text_excerpt`: Incluir extracto de texto completo

## 📋 Prerequisitos

- Node.js >= 18.17
- npm o yarn

## 🔧 Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd mcp-learn-catalog
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Compilar el proyecto
```bash
npm run build
```

### 4. Configurar en Visual Studio Code

#### Configuración MCP en VS Code

1. **Instalar extensión de Claude/MCP** (si no está instalada)

2. **Configurar el servidor MCP** en VS Code:
   - Abrir VS Code
   - Presionar `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac)
   - Buscar "MCP: Add Server" o editar configuración MCP

3. **Añadir configuración en `mcp.json`**:
```json
{
  "servers": {
    "learn-catalog": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/home/dannybombastic/Documents/mcp-learn/dist/server.js"
      ],
      "env": {
        "NODE_NO_WARNINGS": "1"
      }
    }
  }
}
```

4. **Ubicación del archivo de configuración**:
   - **Windows**: `%APPDATA%\Code\User\mcp.json`
   - **macOS**: `~/Library/Application Support/Code/User/mcp.json`
   - **Linux**: `~/.config/Code/User/mcp.json`

#### Configuración alternativa (settings.json)
También puedes configurarlo en VS Code `settings.json`:
```json
{
  "mcp.servers": {
    "mcp-learn-catalog": {
      "command": "node",
      "args": ["/ruta/absoluta/a/mcp-learn-catalog/dist/server.js"]
    }
  }
}
```

### 5. Ejecutar el servidor (modo standalone)
```bash
npm start
```

## 🚀 Uso con Visual Studio Code

### Verificar que el servidor funciona

1. **Reiniciar VS Code** después de añadir la configuración MCP
2. **Abrir la paleta de comandos** (`Ctrl+Shift+P`)
3. **Buscar "MCP"** para ver comandos disponibles
4. **Verificar conexión** - deberías ver el servidor `learn-catalog` listado

### Comandos disponibles en VS Code

Una vez configurado, puedes usar las herramientas desde Claude o cualquier cliente MCP:

#### 🔍 Buscar certificaciones
```javascript
// Buscar certificación AZ-104
searchCatalog({
  q: "AZ-104 Azure Administrator",
  type: "certifications,learningPaths"
})
```

#### 📚 Extraer contenido de módulos
```javascript
// Extraer contenido completo de un módulo
scrapeModuleUnits({
  firstUnitUrl: "https://learn.microsoft.com/training/modules/configure-storage-accounts/1-introduction/",
  max_chars_excerpt: 25000,
  with_text_excerpt: true
})
```

#### 📋 Listar módulos por tipo
```javascript
// Listar todos los módulos disponibles
listCatalog({
  type: "modules",
  max_results: 50
})
```

### Troubleshooting VS Code

#### Problema: Servidor no aparece
- ✅ Verificar que el path en `mcp.json` es absoluto y correcto
- ✅ Asegurar que `npm run build` se ejecutó exitosamente
- ✅ Reiniciar VS Code completamente
- ✅ Verificar logs en la consola de desarrollador de VS Code

#### Problema: Errores de conexión
- ✅ Verificar que Node.js ≥18.17 está instalado
- ✅ Comprobar que todas las dependencias están instaladas (`npm install`)
- ✅ Revisar permisos de archivos en Linux/macOS

#### Problema: Herramientas no disponibles
- ✅ Verificar que la extensión MCP está habilitada
- ✅ Comprobar que el servidor está corriendo sin errores
- ✅ Verificar configuración JSON válida en `mcp.json`

## 🚀 Desarrollo

### Ejecutar en modo desarrollo
```bash
npm run dev
```

### Verificar tipos TypeScript
```bash
npm run check
```

### Estructura del proyecto
```
mcp-learn-catalog/
├── src/
│   ├── server.ts          # Servidor MCP principal
│   └── types/
│       └── html-to-text.d.ts  # Definiciones de tipos
├── dist/                  # Archivos compilados
├── package.json
├── tsconfig.json
└── README.md
```

## 📝 Ejemplo de Configuración Completa

### Archivo `mcp.json` ejemplo completo:
```json
{
  "$schema": "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/schemas/mcp.json",
  "servers": {
    "mcp-learn-catalog": {
      "command": "node",
      "args": [
        "/home/usuario/Documents/mcp-learn/dist/server.js"
      ],
      "env": {},
      "description": "Microsoft Learn Catalog Server - Extrae contenido de certificaciones y módulos"
    }
  }
}
```

### Script de configuración automática (Linux/macOS):
```bash
#!/bin/bash
# setup-vscode-mcp.sh

# Obtener la ruta actual del proyecto
PROJECT_PATH=$(pwd)

# Crear directorio de configuración si no existe
mkdir -p ~/.config/Code/User

# Crear archivo mcp.json
cat > ~/.config/Code/User/mcp.json << EOF
{
  "\$schema": "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/schemas/mcp.json",
  "servers": {
    "mcp-learn-catalog": {
      "command": "node",
      "args": ["$PROJECT_PATH/dist/server.js"],
      "env": {},
      "description": "Microsoft Learn Catalog Server"
    }
  }
}
EOF

echo "✅ Configuración MCP creada en ~/.config/Code/User/mcp.json"
echo "🔄 Reinicia VS Code para aplicar los cambios"
```

### Script de configuración para Windows (PowerShell):
```powershell
# setup-vscode-mcp.ps1

$projectPath = Get-Location
$configPath = "$env:APPDATA\Code\User"

# Crear directorio si no existe
New-Item -ItemType Directory -Force -Path $configPath

# Crear contenido JSON
$mcpConfig = @{
    '$schema' = 'https://raw.githubusercontent.com/modelcontextprotocol/servers/main/schemas/mcp.json'
    servers = @{
        'mcp-learn-catalog' = @{
            command = 'node'
            args = @("$projectPath\dist\server.js")
            env = @{}
            description = 'Microsoft Learn Catalog Server'
        }
    }
}

# Convertir a JSON y guardar
$mcpConfig | ConvertTo-Json -Depth 3 | Out-File -FilePath "$configPath\mcp.json" -Encoding UTF8

Write-Host "✅ Configuración MCP creada en $configPath\mcp.json"
Write-Host "🔄 Reinicia VS Code para aplicar los cambios"
```

## 🎯 Casos de Uso

### Extraer contenido de certificación AZ-104
```javascript
// Buscar certificación AZ-104
searchCatalog({
  q: "AZ-104",
  type: "certifications,learningPaths,modules"
})

// Extraer contenido de un módulo específico
scrapeModuleUnits({
  firstUnitUrl: "https://learn.microsoft.com/en-us/training/modules/configure-storage-accounts/1-introduction/",
  units: ["learn.wwl.configure-storage-accounts.introduction", "learn.wwl.configure-storage-accounts.implement-azure-storage"],
  max_chars_excerpt: 25000,
  with_text_excerpt: true
})
```

### Buscar módulos por tecnología
```javascript
searchCatalog({
  q: "Azure Storage",
  type: "modules",
  level: "intermediate",
  product: "azure"
})
```

## 🔍 Funcionalidades Avanzadas

### Extracción de Tablas
La herramienta `scrapeModuleUnits` extrae automáticamente:
- ✅ Tablas de comparación
- ✅ Especificaciones técnicas
- ✅ Listas de características
- ✅ Diagramas y notas
- ✅ Enlaces y referencias

### Construcción Inteligente de URLs
El servidor construye automáticamente URLs válidas para unidades de Microsoft Learn:
- Detecta patrones de URL base
- Numera secuencialmente las unidades
- Maneja diferentes formatos de slug

### Límites de Contenido Configurable
- Extracción hasta 25,000 caracteres por unidad
- Procesamiento de múltiples unidades en paralelo
- Control de concurrencia para evitar rate limiting

## 🛡️ Dependencias

### Producción
- **@modelcontextprotocol/sdk**: Framework MCP
- **cheerio**: Parser HTML para scraping
- **html-to-text**: Conversión HTML a texto
- **p-limit**: Control de concurrencia
- **zod**: Validación de esquemas

### Desarrollo
- **tsx**: Ejecutor TypeScript
- **typescript**: Compilador TypeScript

## 📊 API de Microsoft Learn

Este servidor se integra con:
- **Microsoft Learn Catalog API**: Para búsqueda y metadatos
- **Microsoft Learn Web Content**: Para extracción de contenido
- **Múltiples locales**: Soporte internacional

## 🚨 Limitaciones

- Rate limiting de Microsoft Learn puede aplicar
- Algunos contenidos pueden requerir autenticación
- El scraping depende de la estructura HTML de Microsoft Learn

## 🤝 Contribuciones

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de uso privado.

## 🔗 Enlaces Útiles

- [Microsoft Learn](https://learn.microsoft.com)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Certificación AZ-104](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/)

## 📞 Soporte

Para reportar problemas o solicitar características, por favor abre un issue en el repositorio.

---

**¡Hecho con ❤️ para facilitar el aprendizaje de Microsoft Azure!**