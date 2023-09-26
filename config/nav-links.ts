export type navItem = {
  name: string;
  slug: string;
  description?: string;
};

export const navItems: { name: string; items: navItem[] }[] = [
  {
    name: 'Gestión piso de producción',
    items: [
      {
        name: 'Órdenes de producción',
        slug: 'production-orders',
        description: 'Crea órdenes de produccion para piso',
      },
      {
        name: 'Órdenes de trabajo',
        slug: '',
        description: 'Crea y lista órdenes de trabajo',
      },
      {
        name: 'Plan de producción',
        slug: '',
        description: 'Lista los planes de producción activos',
      },
      {
        name: 'Controles de calidad',
        slug: '',
        description: 'Procesos de control de calidad',
      },
    ],
  },
  {
    name: 'Usuario',
    items: [
      {
        name: 'Cambiar contraseña',
        slug: '',
        description:
          'Cambiar contraseña del usuario actual',
      },
      {
        name: 'Cerrar Sessión',
        slug: '',
        description:
          'Cierra sessión en el sistema',
      },
    ],
  },
];
