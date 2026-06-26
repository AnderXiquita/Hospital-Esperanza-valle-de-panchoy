export interface NotificacionPublica {
  id:         number;
  tipo:       string;
  titulo:     string;
  mensaje:    string;
  leida:      boolean;
  link:       string | null;
  created_at: Date;
}

export interface ListaNotificacionesResponse {
  notificaciones: NotificacionPublica[];
  total:          number;
  no_leidas:      number;
}
