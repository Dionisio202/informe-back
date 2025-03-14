import { Autor } from "../interfaces/persona.interfaces";

export const mapAutor = (autor: any): Autor => {
  return {
    id_persona: autor.id_persona || null,
    id_rol: autor.id_rol,
    id_facultad_carrera: autor.id_carrera || autor.id_facultad || null, // Corregido
    ciudad: autor.ciudad || null,
    identificacion: autor.identificacion || '',
    nombre: autor.Nombre || autor.nombre, // Usamos 'Nombre' si es lo que devuelve la BD
    telefono: autor.telefono || '',
    fecha_nacimiento: autor.fecha_nacimiento ? new Date(autor.fecha_nacimiento) : undefined,
    direccion: autor.direccion || '',
    correo: autor.correo || '',
    id_autor_producto: autor.id_autor_producto, // Campo que viene de la BD
    id_producto: autor.id_producto,             // Campo que viene de la BD
    id_autor: autor.id_autor,                   // Campo que viene de la BD
    porcentaje_participacion: autor.porcentaje_participacion,
  };
};
