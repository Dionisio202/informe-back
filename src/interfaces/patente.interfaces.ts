export interface Registro {
    id_funcionario: number;
    id_proceso: number;
    id_caso: number;
  }
  
  export interface Proceso {
    id_proceso: number;
    nombre_proceso: string;
  }
  
  export interface ProductoDatos {
    id_registro: string;
    jsonProductos: string;
    memorando: string;
  }
  
  export interface Documento {
    id_documento: string;
    id_registro: string;
    id_tipo_documento: number;
    codigo_almacenamiento: string;
    codigo_documento: string;
    id_docuemnto_per: string;
  }