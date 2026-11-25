# ¡Cumpleaños en la playa! 🏖️

Aplicación estática en español para repartir los ingredientes de un cumpleaños entre 18 invitados. React + Vite + TypeScript + Tailwind CSS + Lucide, con una planilla **privada** de Google Sheets y una API de Google Apps Script. Incluye despliegue automático a GitHub Pages.

## Estado de entrega

El código incluye el catálogo exacto de 23 ingredientes ($3935 UYU), los 18 invitados, identificación con PIN individual, aportes parciales, bolsita editable, organización general, administración, exportación y pruebas de lógica del backend. No hay base de datos simulada ni confirmaciones locales.

Sin `VITE_API_URL`, se muestra una **vista previa identificada como tal**, con el catálogo inicial y sin aportes ficticios. Se puede armar una bolsita temporal para explorar; no se puede confirmar. La sesión sí se guarda localmente. Una vez conectada la API, los aportes se guardan únicamente en Sheets y el resumen se consulta cada 30 segundos mientras la pestaña está visible, al recuperar el foco y después de guardar.

**No se ha publicado ni probado contra una planilla real o un dominio de GitHub Pages en esta entrega.** Las pruebas automatizadas ejecutan los archivos `.gs` reales con implementaciones de prueba de las APIs de Google. La comprobación visual del navegador quedó bloqueada por Computer Use al no poder verificar la URL de Chrome. Completá la lista de aceptación al final antes de compartir el sitio.

## 1. Instalar y abrir localmente

Requiere Node.js 22.12+ (también compatible con Node 24) y npm.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Abrí la dirección que imprime Vite, normalmente `http://127.0.0.1:5173/`. Para verificar y compilar:

```powershell
npm test
npm run build
npm run preview
```

El proyecto vive en la raíz del repositorio. No hace falta crear otra carpeta `cumple-playa`. El nombre del paquete y la ruta predeterminada de compilación son `cumple-playa`; Actions utiliza automáticamente el nombre real del repositorio, que puede ser `Cum-Nahuel`.

## 2. Crear la planilla privada

1. Creá una planilla nueva en Google Sheets con tu cuenta de organizador.
2. Conservá el acceso **Restringido**. No la publiques en la web ni compartas acceso con invitados.
3. Copiá el ID de la URL: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`.
4. Abrí **Extensiones → Apps Script** desde esa planilla.

## 3. Configurar Apps Script

Creá archivos de script con estos nombres y copiá sus contenidos desde el repositorio:

```text
apps-script/
  Code.gs           # Enrutamiento, respuestas, acceso a Sheets y configuración
  Auth.gs           # PIN, sesiones y administrador
  Ingredientes.gs   # Disponibilidad, resumen y administración del catálogo
  Invitados.gs      # Invitados y regeneración de PIN
  Selecciones.gs    # Validación, edición e idempotencia
  Setup.gs          # Inicialización que preserva datos existentes
  appsscript.json   # V8, zona horaria y scope de Sheets
```

En Configuración del proyecto activá **Mostrar el archivo de manifiesto appsscript.json** y copiá el manifiesto. No agregues secretos al código.

En **Configuración del proyecto → Propiedades de la secuencia de comandos**, agregá:

| Propiedad | Valor |
| --- | --- |
| `SPREADSHEET_ID` | ID de la planilla privada |
| `ADMIN_PASSWORD` | Contraseña propia de 12 a 200 caracteres; es temporal |

## 4. Inicializar los datos

Seleccioná `inicializarProyecto` en el editor y ejecutala. Autorizá con la cuenta propietaria. La función crea las pestañas, los encabezados y los datos iniciales:

| Pestaña | Columnas |
| --- | --- |
| Invitados | id, nombre, pinHash, activo |
| Ingredientes | id, nombre, categoria, cantidadRequerida, unidad, incremento, precioTotal, activo |
| Selecciones | id, invitadoId, ingredientesJson, estado, fechaCreacion, fechaActualizacion |
| Configuracion | clave, valor |

Es seguro volver a ejecutarla: no sobrescribe filas ni configuración existentes. Las marcas `SEEDED_GUESTS` y `SEEDED_INGREDIENTS` evitan recrear filas eliminadas intencionalmente. Un esquema incompatible produce un error en lugar de sobrescribirlo. Usá un proyecto de Apps Script por planilla; no cambies su `SPREADSHEET_ID` para reutilizarlo con otra.

Se incluyen los 18 nombres del pedido y únicamente los ingredientes solicitados. Los PIN comienzan vacíos: los invitados quedan sin acceso hasta que el organizador genere sus PIN. La fecha y la playa quedan a confirmar; los horarios de merienda (17:00) y cena (21:00) son valores iniciales editables.

## 5. Configurar al administrador y generar PIN

1. Ejecutá `configurarAdministrador` desde Apps Script.
2. La función consume `ADMIN_PASSWORD`, crea una sal aleatoria y `ADMIN_PASSWORD_HASH`, y elimina la contraseña temporal. Conservá tu contraseña en un lugar privado.
3. Después de conectar y publicar el frontend, abrí **Organizador** al pie de la página e ingresá esa contraseña.
4. En **Invitados y PIN**, elegí **Nuevo PIN** para cada invitado. Se muestra una única vez y solo en una respuesta administrativa autenticada.
5. Compartí cada PIN de seis dígitos únicamente con su invitado. No se envían mensajes automáticamente.

Para cambiar la contraseña administrativa, cargá otra vez `ADMIN_PASSWORD` y ejecutá `configurarAdministrador`. Invalida las sesiones administrativas anteriores. Regenerar un PIN invalida las sesiones de esa persona. Desactivar invitados también impide usar sus sesiones.

## 6. Publicar la API

1. Apps Script → **Implementar → Nueva implementación → Aplicación web**.
2. **Ejecutar como:** tu cuenta (propietario).
3. **Quién tiene acceso:** Cualquier persona, incluyendo quienes no hayan iniciado sesión en Google. La autorización de escritura la hace esta API mediante PIN/token.
4. Implementá, autorizá y copiá la URL `https://script.google.com/macros/s/…/exec`.
5. No uses la URL `/dev`, que es para editores.
6. Después de modificar los archivos `.gs`, abrí **Administrar implementaciones → Editar → Nueva versión → Implementar**, conservando la URL existente.

Algunas cuentas de Workspace no permiten acceso anónimo. Si esa opción no aparece, necesitás una cuenta que lo permita o una política de Workspace compatible; un proxy no evita los permisos de Google.

Los datos públicos de esta aplicación son los nombres, el evento, los ingredientes y los aportes. Cualquier persona con la URL puede consultarlos. La planilla, los hashes y las sesiones se mantienen privados. Si necesitás que también el listado de asistentes sea privado, agregá autenticación a las lecturas y al inicio del frontend antes de compartirlo.

## 7. Conectar el frontend

En `.env`:

```dotenv
VITE_API_URL=https://script.google.com/macros/s/TU_IMPLEMENTACION/exec
VITE_BASE_PATH=/cumple-playa/
```

Reiniciá Vite al cambiar variables. `VITE_*` se incorpora al JavaScript público durante la compilación: **nunca guardes contraseñas, PIN, tokens ni claves privadas ahí**. La URL de la API es pública por diseño.

Durante `npm run dev`, la base es `/`. Al compilar localmente, se utiliza `VITE_BASE_PATH` o `/cumple-playa/`. Si el repositorio se llama `Cum-Nahuel`, podés configurar `/Cum-Nahuel/`. La navegación usa fragmentos (`#ingredientes`, `#organizacion`, `#seleccion`, `#admin`), por lo que recargar rutas internas no requiere reglas de servidor.

## 8. Probar GET, POST y CORS

La API usa `fetch`, sigue redirecciones y omite cookies. Los POST tienen `Content-Type: text/plain;charset=UTF-8` y cuerpo JSON, sin encabezados personalizados. No usa `no-cors`, JSONP, ni credenciales en parámetros de URL. Apps Script redirige la respuesta de Content Service a `script.googleusercontent.com`.

1. Abrí `URL_DE_API?action=summary`. Debe devolver JSON con `success`, `data`, `error`, `message`.
2. Desde el sitio, elegí **Conexión → Probar GET y POST desde este sitio**. Consulta el resumen por ambos métodos sin escribir datos. Hacelo **también desde la URL real de GitHub Pages**, porque una prueba por terminal no verifica CORS del navegador.
3. Ingresá con un PIN y confirmá un aporte parcial. Verificá la fila en Sheets.
4. Recargá, recuperá tu aporte, modificalo y eliminálo. Verificá que la disponibilidad se recalcula.

Las lecturas tienen un reintento con espera de 800 ms; los pedidos vencen después de 25 segundos. Las escrituras no se reintentan automáticamente. Ante una respuesta perdida, repetir la misma confirmación reutiliza su `requestId`. El servidor persiste ese ID en la misma fila del aporte: el reintento no duplica cantidades. Una versión obsoleta se rechaza aunque el aporte que originó esa versión haya sido eliminado. El botón **Recuperar mi última confirmación** reemplaza el borrador con la versión del servidor.

### Si CORS bloquea la comunicación directa

Verificá primero acceso anónimo, URL `/exec`, versión publicada y que la respuesta sea JSON y no una página de acceso de Google. Apps Script Content Service no permite configurar libremente encabezados CORS; no agregues métodos de encabezados que no existen en `TextOutput`. No evites el problema con `mode: 'no-cors'`.

Se incluye un relay opcional y ejecutable en `extras/cors-relay/worker.mjs`. Es un Worker serverless sin almacenamiento ni VPS; la API y la validación continúan en Apps Script y los datos en Sheets. Usalo solo si la prueba desde el navegador falla por CORS.

1. Creá un Worker de Cloudflare y copiá `worker.mjs`, o usá Wrangler con una copia de `wrangler.example.jsonc` llamada `wrangler.jsonc`.
2. Configurá `APPS_SCRIPT_URL` con la URL `/exec` y `ALLOWED_ORIGIN` con el origen exacto de Pages, por ejemplo `https://GuyaSuna.github.io`, sin barra final y sin la ruta del repositorio.
3. Publicalo y configurá `VITE_API_URL` con la URL HTTPS del Worker. Volvé a compilar.
4. Repetí la prueba GET/POST, el ingreso y una escritura desde Pages.

El relay admite únicamente GET/POST/OPTIONS, restringe CORS al origen configurado, rechaza credenciales en la query y valida el destino de Apps Script. No registra cuerpos ni almacena tokens. CORS no sustituye la autorización del servidor. Google debe seguir permitiendo que la API responda sin iniciar sesión.

## 9. Subir el proyecto a GitHub

El repositorio de trabajo ya puede tener configurado `origin`. Verificalo antes de cambiarlo:

```powershell
git remote -v
git status
git add .
git commit -m "Crear organizador de cumpleaños en la playa"
git branch -M main
git push -u origin main
```

Si comenzás desde otro directorio sin repositorio, primero ejecutá `git init` y agregá tu propio `origin` con `git remote add origin https://github.com/TU_USUARIO/cumple-playa.git`. No subas `.env`, credenciales, copias de la planilla ni archivos de sesión. `.gitignore` ya los excluye.

## 10. Habilitar GitHub Pages y configurar Actions

1. GitHub → repositorio → **Settings → Pages → Source → GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables → New repository variable**.
3. Creá **`VITE_API_URL`** con la URL pública de Apps Script o del relay.
4. Ejecutá el workflow **Publicar en GitHub Pages**, o hacé un push a `main`.

`.github/workflows/deploy.yml` usa Node 22, `npm ci`, `npm test`, `npm run build` y las acciones oficiales `configure-pages`, `upload-pages-artifact` y `deploy-pages`. Otorga `contents: read`, `pages: write` e `id-token: write`. El despliegue deriva la base de `github.event.repository.name`, por lo que funciona sin renombrar `Cum-Nahuel`.

Si cambiás la variable de API, volvé a ejecutar el workflow: las variables de Vite se aplican al compilar. Para un dominio personalizado que sirva desde `/`, ajustá `VITE_BASE_PATH` del workflow a `/` y configurá ese dominio en Pages.

## 11. Compartir con los invitados

Después de pasar la lista de aceptación, compartí la URL que devuelve Pages, normalmente `https://TU_USUARIO.github.io/NOMBRE_REPO/`. Cada invitado selecciona su nombre, ingresa su PIN y puede confirmar o cambiar sus aportes. No requiere email ni cuenta Google.

El presupuesto de $200 a $500 UYU es orientativo. Se aceptan aportes menores. El precio de cada aporte es proporcional a la cantidad y los precios son estimaciones; la bolsita no procesa pagos. El organizador se encarga de las comidas principales y los huevos. Cada persona lleva sus bebidas, que no están en el catálogo.

## 12. Copias de seguridad y recuperación

- Desde **Organizador → Copias y exportación**, descargá JSON (configuración, catálogo, invitados y selecciones) o CSV de aportes. No incluyen credenciales.
- Para un respaldo restaurable, duplicá la planilla privada desde **Archivo → Hacer una copia** antes de cambios importantes. Conservá la copia con acceso restringido. El historial de versiones de Sheets también permite recuperar cambios.
- Guardá las Script Properties en un gestor privado, especialmente `SPREADSHEET_ID` y `PIN_PEPPER`. No las exportes a GitHub. Perder `PIN_PEPPER` obliga a regenerar todos los PIN.
- Para restaurar, detené temporalmente el acceso de invitados, recuperá las cuatro pestañas en la planilla original y publicá nuevamente si cambiaste código. Si usás otra planilla, actualizá `SPREADSHEET_ID` manteniendo el mismo proyecto y verificá las selecciones antes de reabrir cambios.
- Borrá las propiedades `session:*` para revocar todas las sesiones luego de una restauración. Los invitados deberán ingresar nuevamente.
- JSON/CSV son exportaciones de consulta: no existe un importador que pueda sobreescribir aportes accidentalmente.

## Reglas de datos y seguridad

- Una sola fila de `Selecciones` por invitado. `ingredientesJson` es un arreglo de `{ingredienteId,cantidad}`; estado `confirmada` o `eliminada`. La eliminación deja una fila vacía para conservar versión e idempotencia. `id` contiene el identificador del último pedido, y `fechaActualizacion` es la versión de concurrencia.
- La disponibilidad se deriva siempre de selecciones confirmadas. No se almacena un contador duplicado de reservas.
- `LockService.getScriptLock()` cubre lectura, validación y escritura; se libera en `finally`. Dos aportes no pueden sobrepasar la cantidad requerida. La escritura del aporte se realiza en una única fila.
- Solo se admiten cantidades enteras positivas, múltiplos del incremento. Las cantidades requeridas deben ser múltiplos del incremento. Un aporte vacío elimina la selección, sin exigir gasto mínimo.
- Los invitados solo editan su propio aporte, aunque envíen otro `guestId`. Los administradores pueden editar aportes aplicando las mismas restricciones de cantidad.
- No se puede desactivar un ingrediente o invitado que tenga aportes comprometidos. Primero modificá o eliminá esos aportes. Cambiar unidades o incrementos tampoco puede invalidar compromisos existentes.
- Los PIN se guardan como hash SHA-256 con una clave aleatoria privada (`PIN_PEPPER`) e identidad. Hay un máximo de 8 intentos por identidad en 15 minutos. La contraseña administrativa tiene sal privada y límite de intentos.
- Los tokens aleatorios solo se devuelven a quien ingresa; el servidor guarda su hash, rol, vencimiento y una huella que permite revocarlos. Invitados: 14 días; organizador: 8 horas. Se eliminan sesiones vencidas al crear otras nuevas.
- Las sesiones se guardan en `localStorage` para recordar el ingreso. Cerrá sesión en dispositivos compartidos. No cargamos scripts externos ni dependemos de cookies de terceros.
- Las respuestas públicas nunca devuelven PIN, hashes ni tokens ajenos. El único endpoint que devuelve un PIN es `regeneratePin`, exclusivamente para el administrador autenticado.
- No modifiques manualmente los encabezados ni dupliques filas de selección. Las ediciones directas en Sheets evitan las validaciones de la API y **no están protegidas por el lock**: pausá cambios y hacelas con cuidado o preferí el panel del organizador. No reduzcas cantidades por debajo de lo comprometido ni cambies unidades/incrementos existentes.
- La cobertura general es el promedio de cobertura de cada ingrediente (limitado al 100%); no suma gramos con unidades o sobres. La cantidad de ingredientes completos se muestra por separado.

## API

Respuesta uniforme: `{success: boolean, data: object | null, error: string | null, message: string}`. Apps Script puede responder HTTP 200 ante errores de negocio: el cliente comprueba `success`.

| Acción | Método | Acceso |
| --- | --- | --- |
| snapshot, config, guests, ingredients, selections, summary | GET o POST | Público, sin secretos |
| login | POST `{guestId,pin}` | Público, con límite de intentos |
| adminLogin | POST `{password}` | Público, con límite de intentos |
| mySelection, logout | POST `{token}` | Sesión válida |
| saveSelection | POST `{token,ingredientes,expectedVersion,requestId}` | Invitado, solo su selección |
| deleteSelection | POST `{token,expectedVersion,requestId}` | Invitado, solo su selección |
| adminSnapshot, export | POST `{token}` | Administrador |
| saveGuest | POST `{token,guest}` | Administrador |
| regeneratePin | POST `{token,guestId}` | Administrador |
| saveIngredient | POST `{token,ingredient}` | Administrador |
| saveConfig | POST `{token,config}` | Administrador |
| adminSaveSelection | POST `{token,guestId,ingredientes,expectedVersion,requestId}` | Administrador |

`expectedVersion` es `''` para un invitado sin fila; después se usa `fechaActualizacion` de su última fila, incluso eliminada. Para agregar invitados/ingredientes omití `id`; para editarlos enviá el ID existente. Todos los POST llevan `action` en el cuerpo. Nunca envíes credenciales por URL.

## Pruebas y aceptación

`npm test` ejecuta los `.gs` en un contexto aislado con una planilla persistente en memoria y mocks de Google que fallan si se accede a Sheets sin lock. Cubre inicialización exacta/idempotente, catálogo, aportes parciales, contención, dos competidores por la misma disponibilidad, edición, eliminación y recreación, respuesta perdida, versiones obsoletas, PIN, intentos fallidos, expiración y revocación, permisos, suplantación, cantidades inválidas, restricciones administrativas, fórmulas, ausencia de secretos y relay CORS. Estos mocks se usan **únicamente en las pruebas**.

No reemplazan la ejecución simultánea en la infraestructura de Google ni el comportamiento del navegador. Antes de usar con los invitados:

- [ ] Publicar Apps Script con una planilla de prueba y comprobar GET/POST desde Pages con el botón de Conexión.
- [ ] Generar un PIN, probar PIN incorrecto/correcto, recargar y comprobar que se conserva la sesión.
- [ ] Desde dos sesiones independientes, confirmar simultáneamente cantidades cuya suma supera lo disponible: una debe recibir rechazo; Sheets nunca debe superar lo requerido.
- [ ] Confirmar 500 g de muzarela, comprobar 1000 g disponibles; modificar, eliminar y volver a confirmar.
- [ ] Interrumpir la respuesta al confirmar y reintentar: comprobar una única fila por persona, sin suma duplicada.
- [ ] Abrir dos pestañas del mismo invitado, guardar en una e intentar guardar la versión anterior en la otra: debe rechazarse y permitir recuperar la confirmación.
- [ ] Cambiar PIN y desactivar un invitado sin aporte: su sesión anterior debe fallar.
- [ ] Probar panel administrativo, cambios de evento, ingredientes, aportes, exportación y cierre de modificaciones.
- [ ] Revisar en móvil de 360–390 px y escritorio: navegación, filtros, selectores, modal, bolsita, confirmación, mensajes de error y ausencia de desplazamiento horizontal.
- [ ] Recargar `#organizacion` directamente en Pages y verificar que no hay errores 404 en los recursos.
- [ ] Duplicar la planilla y comprobar que el respaldo conserva todos los datos.

## Referencias oficiales

- [Vite: despliegue estático y GitHub Pages](https://vite.dev/guide/static-deploy)
- [Google Apps Script: Content Service y redirecciones](https://developers.google.com/apps-script/guides/content)
- [Google Apps Script: aplicaciones web](https://developers.google.com/apps-script/guides/web)
- [Google Apps Script: Lock Service](https://developers.google.com/apps-script/reference/lock/lock-service)
- [Google Apps Script: Script Properties](https://developers.google.com/apps-script/reference/properties/properties-service)

Apps Script tiene cuotas de tiempo, ejecución y propiedades de acuerdo con el tipo de cuenta. Este diseño apunta a un evento pequeño de 18 aportantes, no a una plataforma de uso masivo.
