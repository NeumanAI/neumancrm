

# Plan: Agregar boton "Nuevo contrato" en la pagina de Cartera

## Problema
La pagina `/cartera` no tiene forma directa de crear contratos. El unico flujo es desde RealEstateProjectDetail, lo cual no es intuitivo.

## Solucion

### Archivo: `src/pages/Portfolio.tsx`
- Agregar boton "Nuevo contrato" en el header junto al titulo
- Al hacer clic, abrir un dialog para seleccionar primero el proyecto y el contacto (comprador)
- Luego abrir el `CreateContractDialog` existente con esos datos

### Archivo nuevo: `src/components/portfolio/NewContractWizard.tsx`
Dialog previo al CreateContractDialog que permite:
1. Seleccionar un proyecto inmobiliario (dropdown con proyectos existentes)
2. Seleccionar un contacto/comprador (busqueda por nombre entre los leads del proyecto seleccionado, o entre todos los contactos de la organizacion)
3. Al confirmar, abre el `CreateContractDialog` con projectId y contactId pre-llenados

### Flujo completo
```text
Pagina /cartera
  └─ Boton "Nuevo contrato"
       └─ NewContractWizard (seleccionar proyecto + contacto)
            └─ CreateContractDialog (wizard 3 pasos existente)
```

### Cambios por archivo
- `src/pages/Portfolio.tsx`: Importar Button, Plus icon, NewContractWizard. Agregar estado `showNewContract`. Renderizar boton y dialog.
- `src/components/portfolio/NewContractWizard.tsx` (nuevo): Dialog con 2 selects (proyecto, contacto) y boton continuar. Usa `useRealEstateProjects` y `useContacts` para poblar opciones. Al confirmar, renderiza `CreateContractDialog`.

