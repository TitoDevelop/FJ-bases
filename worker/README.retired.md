# Integración antigua (retirada del frontend)

El frontend y Netlify ya no usan este Worker ni sus dependencias. Se conserva temporalmente para no interrumpir archivos antiguos ni eliminar cambios locales antes de comprobar el catálogo desplegado.

No instalar ni desplegar esta carpeta para la nueva integración. Las nuevas subidas usan Cloudinary y netlify/functions. Si existen archivos antiguos, configura legacyMediaBaseUrl y mantén su origen hasta migrarlos de forma explícita. Una vez comprobado el catálogo real, se puede retirar esta carpeta y el servicio antiguo.
