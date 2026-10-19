import examenesData from '../data/examenes.json' with { type: 'json' }

export const LIMITE_NOMBRE_AMBIGUO = 10

export const CONSTANTES = Object.freeze({
  // Concreto
  // Ambos factores son válidos; "1 lb = 0.454 kg" equivale a 1 kg ≈ 2.20264 lb.
  KG_A_LB: 2.2046,
  LB_A_KG: 0.454,
  CM_POR_PULGADA: 2.54,
  GRAVA_M3: 0.6,
  LITROS_POR_M3: 1000,
  CUBETA_LITROS: 15,
  CEMENTO_KG: 280,
  SACO_KG: 25,
  // Aire
  DIMENSIONES_FT: Object.freeze({ largo: 21, ancho: 13, alto: 12 }),
  FT3_A_M3: 0.0283168,
  GRAMOS_POR_KG: 1000
})

const examenesPorId = new Map(examenesData.examenes.map((ex) => [ex.id, ex]))

const calculadoras = {
  concreto_cimentacion: (resistenciaKgCm2) => {
    const cm2PorPulgada2 = CONSTANTES.CM_POR_PULGADA ** 2
    return {
      a: {
        psi: resistenciaKgCm2 * CONSTANTES.KG_A_LB * cm2PorPulgada2,
        // Variante para quien usa 1 lb = 0.454 kg en lugar de 1 kg = 2.2046 lb.
        psiAlterno: resistenciaKgCm2 * (1 / CONSTANTES.LB_A_KG) * cm2PorPulgada2
      },
      b: { cubetas: (CONSTANTES.GRAVA_M3 * CONSTANTES.LITROS_POR_M3) / CONSTANTES.CUBETA_LITROS },
      c: { sacos: CONSTANTES.CEMENTO_KG / CONSTANTES.SACO_KG }
    }
  },

  masa_de_aire: (densidadKgM3) => {
    const { largo, ancho, alto } = CONSTANTES.DIMENSIONES_FT
    const volumenFt3 = largo * ancho * alto
    const volumenM3 = volumenFt3 * CONSTANTES.FT3_A_M3
    const masaKg = volumenM3 * densidadKgM3
    return {
      densidad: { valor: densidadKgM3 },
      volumen_ft3: volumenFt3,
      volumen_m3: volumenM3,
      masa_kg: masaKg,
      masa_g: masaKg * CONSTANTES.GRAMOS_POR_KG
    }
  }
}

export function getPrimerNombre(nombre) {
  const texto = typeof nombre === 'string' ? nombre.trim() : ''
  if (texto === '') {
    return { primerNombre: '', a: 0, esAmbiguo: false }
  }
  const [primerNombre] = texto.split(/\s+/)
  const a = primerNombre.length
  return { primerNombre, a, esAmbiguo: a >= LIMITE_NOMBRE_AMBIGUO }
}

export function obtenerExamenPorId(id) {
  return examenesPorId.get(Number(id)) ?? null
}

export function calcularParametro(examen, a) {
  if (!examen) return null
  const textoConA = (examen.expresion_parametro ?? '').replace(/a/g, String(a))
  const valor = Number(textoConA)
  return Number.isNaN(valor) ? null : { valor, textoConA }
}

export function calcularRespuestasCorrectas(examen, valorParametro) {
  const calcular = calculadoras[examen?.categoria]
  const valor = Number(valorParametro)
  if (!calcular || Number.isNaN(valor)) return null
  return calcular(valor)
}

export function formatear(n, decimales = 2) {
  const num = Number(n)
  return Number.isFinite(num) ? num.toFixed(decimales) : 'N/A'
}