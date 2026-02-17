
# Eliminar BITAN CORP y limpiar BitanCorp

## Resumen

Ambas organizaciones estan vacias de datos de negocio (0 contactos, 0 empresas, 0 oportunidades, etc.), por lo que la eliminacion es segura y sencilla.

## Datos verificados

| Organizacion | ID | Tipo | Miembros | Datos CRM |
|---|---|---|---|---|
| BITAN CORP (independiente) | `e214cf46-ff50-4c81-a664-4897f0c89a61` | direct, sin padre | 1 (comercial@bitancorp.com) | 0 en todas las tablas |
| BitanCorp (sub-cliente BitanAI) | `6e6d3ae0-07f9-4ecd-8486-caab0812136e` | direct, padre: BitanAI | 0 | 0 en todas las tablas |

No hay registros dependientes en ninguna tabla (domains, onboarding, activity_feed, comments, calendar_goals).

## Acciones a ejecutar

### Paso 1: Eliminar team member de BITAN CORP

Eliminar el unico miembro (`comercial@bitancorp.com`) de la organizacion independiente BITAN CORP. El usuario seguira existiendo en `auth.users` y podra acceder a cualquier otra organizacion donde tenga membresía.

### Paso 2: Eliminar la organizacion BITAN CORP

Eliminar el registro de la tabla `organizations` con ID `e214cf46-ff50-4c81-a664-4897f0c89a61`.

### Paso 3: Eliminar la organizacion BitanCorp (sub-cliente)

Eliminar el registro de la tabla `organizations` con ID `6e6d3ae0-07f9-4ecd-8486-caab0812136e`. No tiene miembros ni datos asociados.

## Nota importante

El usuario `comercial@bitancorp.com` NO sera eliminado del sistema. Su cuenta de autenticacion permanece intacta. Si necesita acceso al CRM bajo BitanAI, se debera crear una nueva membresía en la organizacion correcta.

## Seccion tecnica

Se ejecutaran 3 operaciones SQL en orden:

```text
1. DELETE FROM team_members 
   WHERE organization_id = 'e214cf46-ff50-4c81-a664-4897f0c89a61'

2. DELETE FROM organizations 
   WHERE id = 'e214cf46-ff50-4c81-a664-4897f0c89a61'

3. DELETE FROM organizations 
   WHERE id = '6e6d3ae0-07f9-4ecd-8486-caab0812136e'
```

No se requieren migraciones de esquema ni cambios de codigo. Son solo operaciones de datos.
