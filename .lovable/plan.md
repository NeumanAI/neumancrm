

## Plan: Desactivar Verificación de Email para Desarrollo

### Objetivo
Configurar Supabase Auth para permitir registro e inicio de sesión inmediato sin necesidad de confirmar el email, facilitando las pruebas durante el desarrollo.

### Cambio Requerido

Se utilizará la herramienta de configuración de autenticación de Supabase para habilitar la opción de auto-confirmar emails de registro.

### Detalles Técnicos

| Configuración | Valor Actual | Nuevo Valor |
|---------------|--------------|-------------|
| Auto-confirm emails | `false` | `true` |

### Flujo Después del Cambio

```text
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE REGISTRO                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. Usuario va a /auth                                     │
│                    ↓                                        │
│   2. Selecciona "Crear Cuenta"                              │
│                    ↓                                        │
│   3. Ingresa email + contraseña (mín. 6 caracteres)         │
│                    ↓                                        │
│   4. Click "Crear Cuenta"                                   │
│                    ↓                                        │
│   5. ✓ Cuenta creada y confirmada automáticamente           │
│                    ↓                                        │
│   6. Redirige a /dashboard inmediatamente                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Cómo Probar

Una vez aplicado el cambio:

1. Ir a `/auth`
2. Seleccionar la pestaña **"Crear Cuenta"**
3. Ingresar cualquier email (puede ser ficticio como `test@example.com`)
4. Ingresar una contraseña de al menos 6 caracteres
5. Click en **"Crear Cuenta"**
6. Serás redirigido automáticamente al Dashboard

### Nota Importante

Esta configuración es solo para desarrollo. Antes de ir a producción, se debe volver a activar la verificación de email para mayor seguridad.

