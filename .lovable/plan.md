

## Alcance actual de la integración Bitancorp

La integración con Bitancorp está configurada **exclusivamente para una cuenta específica**, no para todo el CRM.

### Evidencia en el código del fetch de Bitancorp

El fetch tiene valores hardcodeados:

```text
user_id:         "e595967d-a0cc-4cf2-ba94-32aa81d3eee0"
organization_id: "5179d17c-7107-46ea-ba1a-88a029bf74d9"
```

Esto significa que **todos los mensajes** que lleguen desde el webchat de Bitancorp se asignarán a ese usuario y organización específicos. Las conversaciones, contactos y notificaciones se crean bajo esa cuenta.

### Implicaciones

- **Otros usuarios del CRM no verán** los mensajes de Bitancorp (a menos que pertenezcan a la misma organización y tengan permisos)
- Si en el futuro se quiere conectar otro sitio web (de otro cliente del CRM), se necesitaría un fetch separado con su propio `user_id` y `organization_id`
- El endpoint `n8n-chat` es genérico y soporta cualquier cuenta; lo que determina el destino es el payload que envía cada sitio externo

### ¿Se podría hacer para todo el CRM?

Sí, el endpoint ya lo soporta. Cada cliente del CRM podría tener su propio widget webchat apuntando al mismo endpoint pero con sus propios credenciales (`user_id` y `organization_id`). Esto ya está contemplado en la arquitectura actual — solo falta una interfaz en el CRM donde cada usuario pueda copiar su snippet personalizado con sus IDs.

