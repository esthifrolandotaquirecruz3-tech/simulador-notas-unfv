# Simulador de Notas UNFV

Aplicación web para simular el cálculo de notas finales por curso, pensada para estudiantes de la
Universidad Nacional Federico Villarreal (UNFV) — Facultad de Ingeniería Electrónica e Informática (FIEI).

El simulador permite registrar varios cursos, definir la estructura de evaluación de cada uno y ver
de inmediato qué nota se necesita para aprobar.

## Funcionalidades

- **Varios cursos en paralelo**, organizados en pestañas.
- **Esquemas de evaluación predefinidos**: 40-30-30, 30-30-40 y 50-25-25 (prácticas / parcial / final).
- **Nota mínima configurable** (por defecto 10.5).
- **Modo de redondeo**: entero o exacto a dos decimales.
- **Cálculo automático** del promedio final por curso y del avance general.
- **Tabla resumen** con el estado de todos los cursos.
- **Guardado local** del progreso en el navegador (`localStorage`), sin servidores ni cuentas.

## Tecnologías

HTML5, CSS3 y JavaScript puro (sin frameworks ni dependencias externas).

## Estructura del proyecto

```
index.html   → estructura de la interfaz
styles.css   → estilos y diseño visual
app.js       → lógica de cálculo, pestañas y persistencia
Uni.jpg      → imagen de fondo
```

## Cómo ejecutarlo

1. Descarga o clona el repositorio.
2. Abre `index.html` en tu navegador.

También puedes verlo publicado en GitHub Pages (ver el enlace del repositorio).

## Autor

[Tu nombre] — Estudiante de Ingeniería Informática, UNFV.
