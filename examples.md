# MCP Learn Catalog Server v2.0.0 - Ejemplos de Uso

## Nuevas Herramientas (Tools) Implementadas

### 1. `findByProduct` - Buscar contenido por producto de Microsoft

```json
{
  "tool": "findByProduct",
  "arguments": {
    "product": "azure",
    "type": "modules",
    "level": "beginner",
    "max_results": 10
  }
}
```

### 2. `findCertificationPath` - Buscar rutas de certificación

```json
{
  "tool": "findCertificationPath",
  "arguments": {
    "certification_type": "azure-fundamentals",
    "include_prerequisites": true,
    "max_results": 5
  }
}
```

### 3. `getLearningPathDetails` - Obtener detalles completos de learning paths

```json
{
  "tool": "getLearningPathDetails",
  "arguments": {
    "learning_path_uid": "learn.wwl.azure-fundamentals",
    "include_modules": true,
    "include_prerequisites": true
  }
}
```

### 4. `getAdvancedSearch` - Búsqueda avanzada con múltiples filtros

```json
{
  "tool": "getAdvancedSearch",
  "arguments": {
    "query": "machine learning",
    "products": ["azure", "dotnet"],
    "roles": ["data-scientist", "developer"],
    "levels": ["intermediate", "advanced"],
    "subjects": ["artificial-intelligence"],
    "type": "modules,learningPaths",
    "sort_by": "popularity",
    "max_results": 20
  }
}
```

### 5. `scrapeLearningPath` - Extraer contenido completo de learning paths

```json
{
  "tool": "scrapeLearningPath",
  "arguments": {
    "learning_path_uid": "learn.wwl.azure-fundamentals",
    "max_modules": 5,
    "max_units_per_module": 10,
    "with_text_excerpt": true,
    "max_chars_excerpt": 800
  }
}
```

## Mejoras Implementadas

### Nuevas Interfaces TypeScript

- `ModuleItem`: Estructura para módulos de aprendizaje
- `LearningPathItem`: Estructura para rutas de aprendizaje  
- `CertificationItem`: Estructura para certificaciones

### Funciones de Filtrado Mejoradas

- `filterByProduct()`: Filtrar por productos de Microsoft
- `filterByRole()`: Filtrar por roles profesionales
- `filterByLevel()`: Filtrar por nivel de dificultad
- `filterBySubject()`: Filtrar por materias/temas

### Funciones de Ordenamiento

- `sortByPopularity()`: Ordenar por popularidad
- `sortByRating()`: Ordenar por calificación
- `sortByDuration()`: Ordenar por duración

### Mejoras en Manejo de URLs

- Mejor manejo de prefijos `learn.wwl.`
- Construcción de URLs más robusta
- Validación mejorada de UIDs

## Capacidades Extendidas

1. **Búsqueda Multi-Producto**: Buscar contenido específico de Azure, .NET, Microsoft 365, etc.
2. **Rutas de Certificación**: Encontrar y mapear rutas hacia certificaciones específicas
3. **Extracción de Contenido**: Obtener el contenido completo de learning paths con sus módulos
4. **Filtrado Avanzado**: Múltiples criterios de filtrado simultáneos
5. **Control de Concurrencia**: Limitación de requests simultáneos para mejor rendimiento

## Casos de Uso Típicos

### Desarrollador que quiere aprender Azure
```json
{
  "tool": "findByProduct",
  "arguments": {
    "product": "azure",
    "type": "learningPaths",
    "level": "beginner",
    "role": "developer"
  }
}
```

### Buscar certificación específica
```json
{
  "tool": "findCertificationPath", 
  "arguments": {
    "certification_type": "az-900",
    "include_prerequisites": true
  }
}
```

### Extraer contenido completo para estudio offline
```json
{
  "tool": "scrapeLearningPath",
  "arguments": {
    "learning_path_uid": "learn.azure.intro-to-azure-fundamentals",
    "with_text_excerpt": true,
    "max_chars_excerpt": 1000
  }
}
```