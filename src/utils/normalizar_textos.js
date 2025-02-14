const { parse, format, isValid } = require("date-fns");
const { es } = require("date-fns/locale");
// 📌 Convertir nombre del mes a número
const meses = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};
// 📌 Función para normalizar fechas a formato "YYYY-MM-DD"
function normalizarFecha(fecha) {
  if (
    !fecha ||
    fecha.trim() === "" ||
    fecha.trim().toLowerCase() === "fecha inválida"
  ) {
    return null; // Enviamos `null` para datos inválidos
  }

  // **1️⃣ Limpiar el texto (eliminar puntos, espacios extra y convertir a minúsculas)**
  fecha = fecha.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();

  // **2️⃣ Manejo de formato "DD de MES de YYYY"**
  const regexTexto = /^(\d{1,2})\s+de\s+([a-zA-Z]+)\s+(?:de|del)\s+(\d{4})$/i;
  let match = fecha.match(regexTexto);
  if (match) {
    let day = match[1].padStart(2, "0"); // Asegurar que tenga 2 dígitos
    let monthText = match[2];
    const year = match[3];

    let month = meses[monthText];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // **3️⃣ Manejo de formato "MES DD, YYYY" (ejemplo: "agosto 23, 2023")**
  const regexMesTexto = /^([a-zA-Z]+)\s+(\d{1,2}),\s*(\d{4})$/i;
  match = fecha.match(regexMesTexto);
  if (match) {
    let day = match[2].padStart(2, "0");
    let monthText = match[1];
    const year = match[3];

    let month = meses[monthText];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // **4️⃣ Intentar parsear usando `date-fns` con múltiples formatos**
  const formatosPosibles = [
    "yyyy-MM-dd",
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "yyyy/MM/dd",
    "yyyy-MM-dd",
    "dd MMMM yyyy",
    "dd-MM-yyyy",
    "dd/MM/yyyy",
    "dd MM yyyy",
  ];

  for (const formato of formatosPosibles) {
    try {
      const fechaParseada = parse(fecha, formato, new Date(), { locale: es });
      if (isValid(fechaParseada)) {
        return format(fechaParseada, "yyyy-MM-dd");
      }
    } catch (error) {
      continue;
    }
  }

  // **5️⃣ Manejo de fechas con espacios adicionales (ej: "03 - 03 - 2000")**
  const fechaSinEspacios = fecha.replace(/\s+/g, "");
  const formatosSinEspacios = [
    "dd-MM-yyyy",
    "dd/MM/yyyy",
    "yyyy-MM-dd",
    "yyyy/MM/dd",
  ];

  for (const formato of formatosSinEspacios) {
    try {
      const fechaParseada = parse(fechaSinEspacios, formato, new Date(), {
        locale: es,
      });
      if (isValid(fechaParseada)) {
        return format(fechaParseada, "yyyy-MM-dd");
      }
    } catch (error) {
      continue;
    }
  }
  return null; // Si no pudo convertir, devuelve `null`
}

// 📌 Normaliza la capitalización del texto (maneja tildes correctamente)
function capitalizarTexto(texto) {
  return texto
    .toLowerCase()
    .replace(
      /(^|\s)([a-záéíóúñ])/g,
      (match, espacio, letra) => espacio + letra.toUpperCase()
    );
}

function normalizarTextoPDF(texto) {
  // Dividir el texto en líneas y eliminar espacios en los extremos
  let lineas = texto
    .split("\n")
    .map((linea) => linea.trim().replace(/\s+/g, " "));

  // Inicializar el resultado
  let normalizado = [];

  // Procesar la primera línea (fecha)
  normalizado.push(lineas[0]);
  normalizado.push(""); // Línea en blanco después de la fecha

  // Buscar la primera línea no vacía después de la fecha
  let indiceActual = 1;
  while (indiceActual < lineas.length && !lineas[indiceActual].trim()) {
    indiceActual++;
  }

  // Procesar las siguientes 4 líneas no vacías (encabezado)
  let lineasEncabezado = 0;
  while (indiceActual < lineas.length && lineasEncabezado < 4) {
    if (lineas[indiceActual].trim()) {
      normalizado.push(lineas[indiceActual]);
      normalizado.push(""); // Agregar línea en blanco
      lineasEncabezado++;
    }
    indiceActual++;
  }

  // Buscar y procesar la línea "Presente"
  while (
    indiceActual < lineas.length &&
    !lineas[indiceActual].includes("Presente")
  ) {
    indiceActual++;
  }
  if (indiceActual < lineas.length) {
    normalizado.push(lineas[indiceActual]); // Agregar "Presente"
    normalizado.push(""); // Agregar línea en blanco
    indiceActual++;
  }

  // Procesar el saludo y el texto hasta ":"
  let textoSaludo = [];
  while (indiceActual < lineas.length && !lineas[indiceActual].includes(":")) {
    if (lineas[indiceActual].trim()) {
      textoSaludo.push(lineas[indiceActual]);
    }
    indiceActual++;
  }
  if (textoSaludo.length > 0) {
    normalizado.push(textoSaludo.join(" "));
    normalizado.push("");
  }

  // Agregar la línea con ":"
  if (indiceActual < lineas.length) {
    normalizado.push(lineas[indiceActual]);
    normalizado.push("");
    indiceActual++;
  }

  // Procesar la lista numerada
  let elementoLista = [];
  let numeroLista = 1;
  while (indiceActual < lineas.length) {
    let linea = lineas[indiceActual].trim();
    if (linea.startsWith(`${numeroLista}.-`)) {
      if (elementoLista.length > 0) {
        normalizado.push(elementoLista.join(" "));
        normalizado.push("");
        elementoLista = [];
      }
      elementoLista.push(linea);
      numeroLista++;
    } else if (linea && elementoLista.length > 0) {
      elementoLista.push(linea);
    } else if (!linea && elementoLista.length > 0) {
      normalizado.push(elementoLista.join(" "));
      normalizado.push("");
      break;
    }
    indiceActual++;
  }

  // Procesar el párrafo final
  let parrafoFinal = [];
  let textoCompleto = "";
  while (indiceActual < lineas.length) {
    if (lineas[indiceActual].trim()) {
      // Acumular todas las líneas del párrafo
      textoCompleto += " " + lineas[indiceActual];

      // Verificar si la línea contiene un año seguido de un punto
      if (lineas[indiceActual].match(/\b20[2-3][0-9]\./)) {
        // Procesar todo el texto acumulado
        textoCompleto = textoCompleto.trim().replace(/\s+/g, " ");

        // Buscar y procesar el código después de "Resolución"
        let partes = textoCompleto.split("Resolución");
        if (partes.length > 1) {
          // Tomar la parte después de "Resolución"
          let segundaParte = partes[1];
          // Encontrar el índice del primer punto después de "Resolución"
          let indicePunto = segundaParte.indexOf(".");
          if (indicePunto !== -1) {
            // Extraer el código (desde después de "Resolución" hasta el punto)
            let codigo = segundaParte.substring(0, indicePunto);
            // Limpiar el código (eliminar espacios)
            let codigoLimpio = codigo.replace(/\s+/g, "");
            // Reconstruir el texto
            textoCompleto =
              partes[0] +
              "Resolución " +
              codigoLimpio +
              segundaParte.substring(indicePunto);
          }
        }

        normalizado.push(textoCompleto);
        normalizado.push("");
        indiceActual++;
        break;
      }
    }
    indiceActual++;
  }

  // Procesar las líneas restantes
  while (indiceActual < lineas.length) {
    if (lineas[indiceActual].trim()) {
      normalizado.push(lineas[indiceActual]);
      normalizado.push("");
    }
    indiceActual++;
  }

  // Eliminar líneas en blanco extra al final
  while (normalizado.length > 0 && !normalizado[normalizado.length - 1]) {
    normalizado.pop();
  }

  return normalizado.join("\n");
}

module.exports = { normalizarFecha, capitalizarTexto, normalizarTextoPDF };