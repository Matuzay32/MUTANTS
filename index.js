import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;
app.use(express.json());

let stats = { mutantes: 0, noMutantes: 0, totalDeMuestras: 0 };

function esMutante(adn) {
  // Tamaño de la matriz
  const n = adn.length;

  // Función para verificar una secuencia en una dirección específica
  function checkDirection(row, col, dx, dy, target) {
    for (let i = 0; i < 4; i++) {
      if (
        row < 0 ||
        row >= n ||
        col < 0 ||
        col >= n ||
        adn[row][col] !== target
      ) {
        return false;
      }
      row += dx;
      col += dy;
    }
    return true;
  }

  // Verificar horizontal, vertical y diagonal
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const current = adn[row][col];

      if (
        checkDirection(row, col, 1, 0, current) || // Horizontal
        checkDirection(row, col, 0, 1, current) || // Vertical
        checkDirection(row, col, 1, 1, current) || // Diagonal derecha
        checkDirection(row, col, 1, -1, current) // Diagonal izquierda
      ) {
        return true; // Encontramos una secuencia de mutante
      }
    }
  }

  return false; // No es un mutante
}

function actualizarEstadisticas(esMutante) {
  if (esMutante) {
    stats.mutantes += 1;
  } else {
    stats.noMutantes += 1;
  }
  stats.totalDeMuestras += 1;
}

const getPorcentajeMutantes = () =>
  stats.totalDeMuestras
    ? `${(stats.mutantes / stats.totalDeMuestras) * 100}%`
    : 0;

const getPorcentajeNoMutantes = () =>
  stats.totalDeMuestras
    ? `${(stats.noMutantes / stats.totalDeMuestras) * 100}%`
    : 0;

//CREA UN CSV CON LOS DATOS DE LOS MUTANTES
function crearArchivoDeTextoConFecha() {
  const filePath = path.join(__dirname, 'Stats.csv');
  const currentDate = new Date();
  const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;
  const header =
    'FechaActual,mutantes,noMutantes,porcentajeDeMutantes,porcentajeDeNoMutantes\n';
  const porcentajeMutantes = (stats.mutantes / stats.totalDeMuestras).toFixed(
    6
  ); // 6 decimales
  const porcentajeNoMutantes = (
    stats.noMutantes / stats.totalDeMuestras
  ).toFixed(6); // 6 decimales

  const data = `${formattedDate},${stats.mutantes},${stats.noMutantes},${porcentajeMutantes},${porcentajeNoMutantes}\n`;

  // Verifica si el archivo ya existe para no agregar el encabezado de nuevo
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, header);
  }

  fs.appendFile(filePath, data, (err) => {
    if (err) {
      console.error('Error al guardar el archivo:', err);
    } else {
      console.log(
        'Datos de estadísticas guardados en "texto.csv" con la fecha actual.'
      );
    }
  });
}

// Ruta para obtener estadísticas
app.get('/stats', (req, res) => {
  crearArchivoDeTextoConFecha();

  const respuesta = {
    ...stats,
    porcentajeDeMutantes: getPorcentajeMutantes(),
    porcentajeNoMutantes: getPorcentajeNoMutantes(),
  };
  res.send(respuesta);
});

// Ruta para obtener el contenido del CSV en formato JSON
app.get('/stats-csv', (req, res) => {
  const filePath = path.join(__dirname, 'Stats.csv');
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      res.json(results);
    });
});

// Ruta para verificar si un ADN es mutante o no
app.post('/mutants', (req, res) => {
  const adn = req.body.dna;
  const result = esMutante(adn);
  actualizarEstadisticas(result);

  if (result) {
    res.send({ respuesta: 'El sujeto es un mutante' });
  } else {
    res.send({ respuesta: 'El sujeto no es un mutante' });
  }
});

app.listen(port, () => {
  console.log(`Server escuchando en el puerto ${port}`);
});
