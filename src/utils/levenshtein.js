// Función para calcular la distancia de Levenshtein
function levenshteinDistance(a, b) {
    // Convertir a minúsculas y eliminar espacios extras
    a = a.trim().toLowerCase();
    b = b.trim().toLowerCase();
    
    const matrix = [];
    let cost;

    // Inicializar la matriz
    for (let i = 0; i <= a.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
    }

    // Calcular distancias
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            cost = a[i - 1] === b[j - 1] ? 0 : 1;
            
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,     // Eliminación
                matrix[i][j - 1] + 1,     // Inserción
                matrix[i - 1][j - 1] + cost // Sustitución
            );
        }
    }

    return matrix[a.length][b.length];
}

// Función para obtener el porcentaje de similitud
function similarityPercentage(a, b) {
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return (1 - distance / maxLength) * 100;
}

module.exports = { similarityPercentage };