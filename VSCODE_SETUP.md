# 🔧 Configuración para Visual Studio Code

## Paso 1: Instalar la extensión MCP
Instala la extensión oficial de MCP en VS Code desde el marketplace.

## Paso 2: Configurar el servidor MCP

### Opción A: Servidor HTTP (Recomendado para deployment)
Agrega esta configuración a tu archivo de configuración MCP de VS Code:

```json
{
  "mcpServers": {
    "mcp-learn-catalog": {
      "transport": {
        "type": "http",
        "url": "http://localhost:3023/mcp",
        "headers": {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "MCP-Protocol-Version": "2025-06-18"
        }
      }
    }
  }
}
```

### Opción B: Para deployment remoto
Si deployaste en un servidor remoto, cambia la URL:

```json
{
  "mcpServers": {
    "mcp-learn-catalog": {
      "transport": {
        "type": "http",
        "url": "https://tu-dominio.com/mcp",
        "headers": {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "MCP-Protocol-Version": "2025-06-18"
        }
      }
    }
  }
}
```

## Paso 3: Reiniciar VS Code
Después de agregar la configuración, reinicia VS Code para que la extensión MCP detecte el servidor.

## Paso 4: Verificar conexión
1. Abre la extensión MCP en VS Code
2. Deberías ver "mcp-learn-catalog" en la lista de servidores conectados
3. Podrás ver las 4 herramientas disponibles:
   - listCatalog
   - searchCatalog
   - getDetail
   - scrapeModuleUnits

## 🚀 Uso en VS Code
Una vez configurado, podrás:
- Buscar módulos de Microsoft Learn directamente desde VS Code
- Obtener contenido de certificaciones como AZ-104
- Extraer información detallada de learning paths
- Acceder al catálogo completo de Microsoft Learn

## 🔍 Troubleshooting
- **Servidor no conecta**: Verifica que el Docker container esté corriendo
- **Timeout de conexión**: Asegúrate que el puerto 3023 esté accesible
- **Error de protocolo**: Confirma que estás usando la versión correcta del protocolo MCP

## 📝 Estado del servidor
Puedes verificar que el servidor esté funcionando visitando:
- Health check: http://localhost:3023/health
- Información: http://localhost:3023/

¡El servidor está listo para integrarse con Visual Studio Code! 🎉