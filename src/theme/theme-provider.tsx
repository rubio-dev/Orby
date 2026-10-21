import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react'; // Contexto, estado y lectura de valores externos
import { useColorScheme } from 'react-native'; // Modo claro u oscuro del sistema operativo

import { temas, type ColoresTema, type Modo, type NombreTema, type Tema } from '@/theme/themes'; // Catálogo de temas disponibles

// TIPOS
// 'sistema' sigue el ajuste del teléfono; 'claro' y 'oscuro' lo fuerzan
export type PreferenciaModo = 'sistema' | Modo;

type ContextoTema = {
  tema: Tema;
  modo: Modo; // Modo efectivo, ya resuelto
  colores: ColoresTema; // Paleta del tema activo en el modo efectivo
  preferencia_modo: PreferenciaModo;
  cambiar_tema: (nombre: NombreTema) => void;
  cambiar_modo: (preferencia: PreferenciaModo) => void;
};

// CONTEXTO
const TemaContexto = createContext<ContextoTema | null>(null);

// HIDRATACIÓN (solo importa en web)
// En web la app se renderiza primero en el servidor, donde no existe window.matchMedia:
// useColorScheme() devuelve null y el modo se resuelve a 'claro'. Si el sistema está en oscuro,
// el cliente resolvería 'oscuro' y React avisa de un desfase de hidratación que no corrige.
// useSyncExternalStore da 'false' en el servidor y en la primera pasada del cliente, y 'true'
// después de hidratar, así que el primer HTML coincide y el modo real se aplica enseguida.
// En nativo no hay render de servidor: vale 'true' desde el principio.
const sin_suscripcion = () => () => {};
const valor_en_cliente = () => true;
const valor_en_servidor = () => false;

// PROVEEDOR
// Envuelve la app y expone el tema y el modo activos; por ahora la elección vive en memoria (no se guarda)
export function TemaProvider({ children }: { children: ReactNode }) {
  const esquema_sistema = useColorScheme();
  const hidratado = useSyncExternalStore(sin_suscripcion, valor_en_cliente, valor_en_servidor);
  const [nombre_tema, set_nombre_tema] = useState<NombreTema>('orby');
  const [preferencia_modo, set_preferencia_modo] = useState<PreferenciaModo>('sistema');

  // Resolver el modo efectivo a partir de la preferencia y del sistema.
  // En la primera pasada de web se ignora el ajuste del sistema (ver 'hidratado' más arriba).
  const modo: Modo = preferencia_modo === 'sistema'
    ? hidratado && esquema_sistema === 'dark'
      ? 'oscuro'
      : 'claro'
    : preferencia_modo;
  const tema = temas[nombre_tema];

  return (
    <TemaContexto.Provider
      value={{
        tema,
        modo,
        colores: tema.paletas[modo],
        preferencia_modo,
        cambiar_tema: set_nombre_tema,
        cambiar_modo: set_preferencia_modo,
      }}
    >
      {children}
    </TemaContexto.Provider>
  );
}

// HOOK
// Acceso al tema activo desde cualquier componente dentro de TemaProvider
export function useTema() {
  const contexto = useContext(TemaContexto);

  // Usarlo fuera del proveedor es un error de programación, no un caso esperado
  if (!contexto) {
    throw new Error('useTema debe usarse dentro de <TemaProvider>');
  }

  return contexto;
}
