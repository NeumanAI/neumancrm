

# Conectar el toggle de modulos en la pagina de Administracion

## Problema
El componente `ModulesDialog` existe en `src/components/admin/ModulesDialog.tsx` pero nunca fue importado ni integrado en `src/pages/Admin.tsx`. Por eso no aparece ninguna opcion para activar el modulo inmobiliario.

## Solucion

### Archivo: `src/pages/Admin.tsx`

1. **Importar** `ModulesDialog` y el icono `HardHat` de lucide-react
2. **Agregar estado** para controlar la apertura del dialog (`modulesOrg` con id, nombre y modulos actuales)
3. **Agregar un boton** "Modulos" en el menu de acciones de cada fila de organizacion (`OrganizationRow`) -- junto a los botones existentes de editar y asignar admin
4. **Renderizar** el `<ModulesDialog />` al final de la pagina, controlado por el estado

### Detalle del boton
- Se agrega un `DropdownMenuItem` o boton con icono `HardHat` en las acciones de cada organizacion
- Al hacer clic, abre el `ModulesDialog` pasando el `id`, `name` y `enabled_modules` de la organizacion seleccionada
- Al guardar, se refrescan los datos de organizaciones

### Flujo para el usuario
1. Ir a **Administracion** (menu lateral, solo visible para super admins)
2. Buscar la organizacion deseada en la tabla
3. Hacer clic en el menu de acciones (3 puntos o dropdown) de esa organizacion
4. Seleccionar **"Modulos"**
5. Activar el switch de **"Proyectos Inmobiliarios"**
6. Guardar

