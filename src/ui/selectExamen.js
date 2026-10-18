/**
 * Convierte el <select> de examen en un desplegable con scroll de altura
 * controlada. El <select> original permanece oculto como única fuente de
 * valor/estado, por lo que el resto de la app sigue leyendo `#examen-id`.
 */
export function initSelectExamen() {
  const select = document.getElementById('examen-id')
  const trigger = document.getElementById('examen-trigger')
  const menu = document.getElementById('examen-menu')
  if (!select || !trigger || !menu) return

  const contenedor = trigger.closest('.select')
  const valorEl = trigger.querySelector('.select-value')
  const placeholder = valorEl?.dataset.placeholder ?? valorEl?.textContent ?? ''

  const items = []
  let activo = -1

  /* --- Construir el menú desde el <select> (única fuente de verdad) --- */
  for (const hijo of select.children) {
    if (hijo.tagName === 'OPTGROUP') {
      const grupo = document.createElement('li')
      grupo.className = 'select-group'
      grupo.setAttribute('role', 'presentation')
      grupo.textContent = hijo.label
      menu.append(grupo)
      for (const opcion of hijo.children) agregarOpcion(opcion)
    } else if (hijo.tagName === 'OPTION') {
      agregarOpcion(hijo)
    }
  }

  function agregarOpcion(opcion) {
    if (opcion.disabled || opcion.value === '') return
    const item = document.createElement('li')
    item.className = 'select-option'
    item.id = `examen-opt-${opcion.value}`
    item.setAttribute('role', 'option')
    item.setAttribute('aria-selected', 'false')
    item.dataset.value = opcion.value
    item.textContent = opcion.textContent
    item.addEventListener('click', () => seleccionar(item))
    item.addEventListener('mousemove', () => marcarActivo(items.indexOf(item)))
    menu.append(item)
    items.push(item)
  }

  /* --- Estado visible --- */
  function sincronizar() {
    const opcion = select.selectedOptions[0]
    const hayValor = select.value !== '' && opcion
    if (valorEl) {
      valorEl.textContent = hayValor ? opcion.textContent : placeholder
      valorEl.classList.toggle('placeholder', !hayValor)
    }
    for (const item of items) {
      item.setAttribute('aria-selected', String(item.dataset.value === select.value))
    }
  }

  function marcarActivo(indice) {
    if (indice < 0 || indice >= items.length) return
    if (activo >= 0) items[activo].classList.remove('active')
    activo = indice
    items[activo].classList.add('active')
    items[activo].scrollIntoView({ block: 'nearest' })
  }

  function abrir() {
    menu.hidden = false
    contenedor?.classList.add('open')
    trigger.setAttribute('aria-expanded', 'true')
    const indice = items.findIndex((item) => item.dataset.value === select.value)
    marcarActivo(indice >= 0 ? indice : 0)
  }

  function cerrar() {
    menu.hidden = true
    contenedor?.classList.remove('open')
    trigger.setAttribute('aria-expanded', 'false')
    activo = -1
  }

  function seleccionar(item) {
    select.value = item.dataset.value
    select.dispatchEvent(new Event('change', { bubbles: true }))
    sincronizar()
    cerrar()
    trigger.focus()
  }

  /* --- Eventos --- */
  trigger.addEventListener('click', () => {
    if (menu.hidden) abrir()
    else cerrar()
  })

  trigger.addEventListener('keydown', (evento) => {
    const abierto = !menu.hidden
    switch (evento.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        evento.preventDefault()
        if (!abierto) return abrir()
        marcarActivo(activo + (evento.key === 'ArrowDown' ? 1 : -1))
        break
      case 'Home':
        if (abierto) {
          evento.preventDefault()
          marcarActivo(0)
        }
        break
      case 'End':
        if (abierto) {
          evento.preventDefault()
          marcarActivo(items.length - 1)
        }
        break
      case 'Enter':
      case ' ':
        if (!abierto) return
        evento.preventDefault()
        if (activo >= 0) seleccionar(items[activo])
        break
      case 'Escape':
        if (abierto) {
          evento.preventDefault()
          cerrar()
        }
        break
    }
  })

  document.addEventListener('click', (evento) => {
    if (!menu.hidden && contenedor && !contenedor.contains(evento.target)) cerrar()
  })

  select.addEventListener('change', sincronizar)

  sincronizar()
}
