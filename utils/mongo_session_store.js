const session_map = new Map();
console.log(session_map);

export const save_session = (session_id, session) => {
  session_map?.set(session_id, session);
};

export const get_session = (session_id) => {
  return session_map?.get(session_id);
};

export const delete_session = (session_id) => {
  session_map?.delete(session_id);
};
