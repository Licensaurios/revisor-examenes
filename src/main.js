import './style.css'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { initSelectExamen } from './ui/selectExamen.js'
import {
  CONSTANTES,
  LIMITE_NOMBRE_AMBIGUO,
  getPrimerNombre,
  obtenerExamenPorId,
  calcularParametro,
  calcularRespuestasCorrectas,
  formatear
} from './utils/examenes.js'

const elementos = {
  form: document.getElementById('upload-form'),
  status: document.getElementById('status'),
  nombre: document.getElementById('inp-nombre'),
  examen: document.getElementById('examen-id'),
  avisoAmbiguo: document.getElementById('aviso-ambiguo'),
  btnRevisar: document.getElementById('btn-revisar'),
  preview: document.getElementById('preview'),
  pvNombre: document.getElementById('pv-nombre'),
  pvA: document.getElementById('pv-a'),
  pvExamen: document.getElementById('pv-examen'),
  pvParam: document.getElementById('pv-param')
}

const SIN_DATO = '-'

/* ---------- Vista previa ---------- */

function describirParametro(examen, a) {
  const parametro = calcularParametro(examen, a)
  if (!parametro) return `${examen.expresion_parametro} (a=${a})`
  const unidad = examen.ejemplo_unidad ?? ''
  return `${formatear(parametro.valor)} ${unidad} (${examen.expresion_parametro} → ${parametro.textoConA})`
}

function actualizarVista() {
  const nombre = elementos.nombre.value
  const examenId = elementos.examen.value
  const { primerNombre, a, esAmbiguo } = getPrimerNombre(nombre)
  const hayNombre = nombre.trim() !== ''
  const hayExamen = examenId !== ''
  const examen = hayExamen ? obtenerExamenPorId(examenId) : null

  elementos.avisoAmbiguo.classList.toggle('visible', esAmbiguo)
  elementos.btnRevisar.disabled = esAmbiguo || !hayNombre || !hayExamen

  elementos.pvNombre.textContent = primerNombre || SIN_DATO
  elementos.pvA.textContent = a > 0 ? String(a) : SIN_DATO

  if (examen) {
    elementos.pvExamen.textContent = `#${examen.id} - ${examen.categoria}`
    elementos.pvParam.textContent = describirParametro(examen, a)
  } else {
    elementos.pvExamen.textContent = hayExamen ? examenId : SIN_DATO
    elementos.pvParam.textContent = SIN_DATO
  }

  elementos.preview.classList.toggle('visible', hayNombre || hayExamen)
}

/* ---------- Generación del reporte (Markdown) ---------- */

const fila = (...celdas) => `| ${celdas.join(' | ')} |`

function tabla(encabezados, filas) {
  return [
    fila(...encabezados),
    fila(...encabezados.map(() => '---')),
    ...filas.map((celdas) => fila(...celdas))
  ].join('\n')
}

function seccionConcreto(parametroValor, correctas) {
  const { KG_A_LB, CM_POR_PULGADA, GRAVA_M3, LITROS_POR_M3, CUBETA_LITROS, CEMENTO_KG, SACO_KG } = CONSTANTES

  return tabla(
    ['Inciso', 'Respuesta correcta', 'Unidad', 'Procedimiento'],
    [
      [
        'a)',
        formatear(correctas.a.psi),
        'psi',
        `${parametroValor} kg/cm² × ${KG_A_LB} lb/kg × ${CM_POR_PULGADA}² cm²/in²`
      ],
      [
        'b)',
        formatear(correctas.b.cubetas),
        'cubetas',
        `(${GRAVA_M3} m³ × ${LITROS_POR_M3} L/m³) / ${CUBETA_LITROS} L/cubeta`
      ],
      ['c)', formatear(correctas.c.sacos), 'sacos', `${CEMENTO_KG} kg / ${SACO_KG} kg/saco`]
    ]
  )
}

function seccionAire(examen, parametroTexto, correctas) {
  const { largo, ancho, alto } = CONSTANTES.DIMENSIONES_FT
  const { FT3_A_M3, GRAMOS_POR_KG } = CONSTANTES
  const volumenFt3 = formatear(correctas.volumen_ft3)
  const volumenM3 = formatear(correctas.volumen_m3)
  const densidad = formatear(correctas.densidad.valor)
  const masaKg = formatear(correctas.masa_kg)

  return tabla(
    ['Concepto', 'Valor', 'Unidad', 'Procedimiento'],
    [
      ['Volumen', volumenFt3, 'ft³', `${largo} × ${ancho} × ${alto}`],
      ['Volumen', volumenM3, 'm³', `${volumenFt3} ft³ × ${FT3_A_M3}`],
      ['Densidad', densidad, 'kg/m³', `${examen.expresion_parametro} → ${parametroTexto}`],
      ['Masa', masaKg, 'kg', `${volumenM3} m³ × ${densidad} kg/m³`],
      ['Masa', formatear(correctas.masa_g), 'g', `${masaKg} kg × ${GRAMOS_POR_KG}`]
    ]
  )
}

const seccionesPorCategoria = {
  concreto_cimentacion: ({ parametro, correctas }) => seccionConcreto(parametro.valor, correctas),
  masa_de_aire: ({ examen, parametro, correctas }) => seccionAire(examen, parametro.textoConA, correctas)
}

function generarReporte({ nombreCompleto, primerNombre, a, examen, parametro, correctas }) {
  const unidad = examen.ejemplo_unidad ?? ''
  const construirSeccion = seccionesPorCategoria[examen.categoria]

  return [
    '# Solución del examen',
    '## Datos del alumno',
    [
      `- **Nombre completo:** ${nombreCompleto || '(sin nombre)'}`,
      `- **Primer nombre:** ${primerNombre || '(n/a)'}`,
      `- **a = número de letras del primer nombre:** ${a}`
    ].join('\n'),
    '## Examen identificado',
    [
      `- **ID:** ${examen.id}`,
      `- **Categoría:** ${examen.categoria}`,
      `- **Expresión del parámetro:** ${examen.expresion_parametro}`,
      `- **Formato valor:** ${examen.formato_valor}`,
      `- **Posición de "a":** ${examen.posicion_de_a}`,
      `- **Valor calculado con a=${a}:** ${formatear(parametro.valor)} ${unidad}`
    ].join('\n'),
    '## Respuestas correctas (con 4 decimales)',
    construirSeccion({ examen, parametro, correctas })
  ].join('\n\n')
}

/* ---------- Eventos ---------- */

function revelarResultado() {
  // En móvil el resultado queda debajo del formulario: lo traemos a la vista.
  elementos.status.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function mostrarMensaje(texto) {
  elementos.status.textContent = texto
  revelarResultado()
}

function mostrarReporte(markdown) {
  // El nombre del alumno es entrada del usuario: se sanea el HTML antes de insertarlo.
  elementos.status.innerHTML = DOMPurify.sanitize(marked.parse(markdown))
  revelarResultado()
}

function manejarEnvio(event) {
  event.preventDefault()

  const nombreCompleto = elementos.nombre.value.trim()
  const examenId = elementos.examen.value
  const { primerNombre, a, esAmbiguo } = getPrimerNombre(nombreCompleto)

  if (esAmbiguo) {
    actualizarVista()
    mostrarMensaje(`Corrige el nombre: un primer nombre con ${LIMITE_NOMBRE_AMBIGUO} o más letras es ambiguo.`)
    return
  }
  if (!examenId) {
    mostrarMensaje('Selecciona un examen.')
    return
  }

  const examen = obtenerExamenPorId(examenId)
  if (!examen) {
    mostrarMensaje('No se encontró el examen seleccionado.')
    return
  }

  const parametro = calcularParametro(examen, a)
  if (!parametro) {
    mostrarMensaje('No se pudo calcular el parámetro con "a".')
    return
  }

  const correctas = calcularRespuestasCorrectas(examen, parametro.valor)
  if (!correctas) {
    mostrarMensaje(`Categoría no soportada: ${examen.categoria}`)
    return
  }

  mostrarReporte(generarReporte({ nombreCompleto, primerNombre, a, examen, parametro, correctas }))
}

elementos.nombre.addEventListener('input', actualizarVista)
elementos.examen.addEventListener('change', actualizarVista)
elementos.form.addEventListener('submit', manejarEnvio)
initSelectExamen()
actualizarVista()