
## Diagnóstico (por qué pasa)
- El mensaje “credenciales no son” corresponde a un **fallo de autenticación** (contraseña incorrecta / no existe contraseña / estás intentando entrar en el entorno equivocado). No es un problema del panel de Super Admin en sí.
- En tu backend de pruebas, **jogedu@gmail.com sí existe y sí es Super Admin** (hay registro en `public.super_admins` para ese usuario). Por eso, una vez logre iniciar sesión, debería poder entrar a `/admin`.
- Ahora mismo la app solo ofrece **login con email + contraseña**. Si no recuerdas la contraseña real de `jogedu@gmail.com` (o si esa cuenta se creó por enlace/ invitación y nunca se definió contraseña), el login seguirá fallando.

## Objetivo
1) Permitir recuperar acceso sin conocer la contraseña (recuperación por email y/o “magic link”).  
2) Evitar que un Super Admin quede atrapado en “pendiente de aprobación”.  
3) Reducir confusiones entre entorno de pruebas vs publicado (y el botón “cuenta dev”).

---

## Cambios propuestos (implementación)

### A) Agregar “Olvidé mi contraseña” + pantalla “Restablecer contraseña”
**Archivos**
- `src/pages/Auth.tsx` (principal)

**UI / Flujo**
1. En la pestaña “Iniciar sesión”, agregar link: **“¿Olvidaste tu contraseña?”**.
2. Al tocarlo, mostrar un pequeño formulario (mismo diseño del Card) para:
   - ingresar email
   - botón “Enviar enlace”
3. Enviar email con:
   - `supabase.auth.resetPasswordForEmail(email, { redirectTo: \`\${window.location.origin}/auth?mode=reset\` })`
4. Cuando el usuario haga clic en el enlace del correo, vuelve a `/auth` con un “recovery session” en la URL.
5. `Auth.tsx` detecta ese modo y muestra un formulario “Nueva contraseña” + “Confirmar contraseña”.
6. Al confirmar:
   - validar con zod (mínimo 6, máximo 72, confirmación coincide)
   - `supabase.auth.updateUser({ password: newPassword })`
   - toast éxito + `navigate('/dashboard')`

**Detalles técnicos**
- Detección del modo “reset”:
  - por query: `mode=reset`
  - y/o por hash: `window.location.hash.includes('type=recovery')`
- Manejar errores comunes:
  - email inválido
  - rate limiting
  - sesión de recovery ausente (mostrar mensaje para volver a pedir el email)

---

### B) Agregar “Iniciar sesión con enlace” (Magic Link) como alternativa rápida
**Archivos**
- `src/pages/Auth.tsx`

**UI / Flujo**
- En “Iniciar sesión”, agregar botón secundario: **“Enviar enlace de acceso”**.
- Acción:
  - `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: \`\${window.location.origin}/dashboard\` } })`
- El usuario entra desde el email sin contraseña y cae autenticado.
- Esto resuelve el caso típico: “no recuerdo contraseña” o “esta cuenta nunca tuvo contraseña”.

**Nota de producto**
- Mantendremos también el login por contraseña; el enlace es opcional.

---

### C) Fix: Super Admin no debe quedar atrapado en “Pendiente de aprobación”
**Archivo**
- `src/pages/PendingApproval.tsx`

**Cambio**
- Importar `useSuperAdmin()`
- Cambiar la condición de redirección:
  - antes: solo redirige si `organization.is_approved`
  - después: redirige si `organization.is_approved || isSuperAdmin`
- Resultado: aunque su organización esté pendiente, un Super Admin puede entrar al CRM y al panel `/admin`.

---

### D) Evitar confusión: botón “Usar cuenta de desarrollo” solo en preview
**Archivo**
- `src/pages/Auth.tsx`

**Cambio**
- Mostrar el botón “🔧 Usar cuenta de desarrollo” únicamente si estás en URL de preview (por ejemplo:
  - `hostname` contiene `id-preview` o `lovableproject`)
- En la URL publicada se oculta para que no intentes entrar con un usuario que quizá solo existe en pruebas.

---

### E) (Opcional, recomendado) Indicador de entorno en la pantalla de Auth
**Archivo**
- `src/pages/Auth.tsx`

**Cambio**
- Un texto pequeño bajo el título:
  - “Entorno de pruebas” si es preview
  - “Entorno publicado” si es el dominio final
- Esto ayuda a entender por qué un usuario puede existir en un entorno y no en el otro.

---

## Pruebas (checklist)
1. En la app publicada:
   - intentar login con `jogedu@gmail.com` (si falla contraseña) → usar “Olvidé mi contraseña” o “Enviar enlace”.
   - confirmar que al entrar puedes abrir `/admin` y no te expulsa.
2. Probar que un usuario NO super admin:
   - si su organización no está aprobada → cae en `/pending-approval`
3. Probar que un super admin:
   - aunque su organización no esté aprobada → NO queda atrapado en `/pending-approval`
4. Verificar que el botón “cuenta dev” no aparece en producción.

---

## Riesgos / Consideraciones
- La recuperación por email depende de que puedas recibir correos (spam/promociones).
- Si tu backend requiere configurar URLs de redirección, usaremos el panel de Lovable Cloud para añadir la URL publicada y la preview a los redirects permitidos (si hiciera falta).

---

## Entregable
- Login recuperable por email + magic link
- Super Admin siempre puede salir de “pendiente”
- Menos confusión entre pruebas y producción
