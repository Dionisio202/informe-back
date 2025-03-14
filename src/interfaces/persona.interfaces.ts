export interface Persona {
    id_persona?: number;
    id_rol?: number;
    id_facultad_carrera?: number;
    ciudad?: number;
    identificacion?: string;
    nombre: string;
    telefono?: string;
    fecha_nacimiento?: Date;
    direccion?: string;
    correo?: string;
}

export interface Autor extends Persona {
    id_autor_producto: number;
    id_producto: number;
    id_autor: number;
    porcentaje_participacion: number;
}