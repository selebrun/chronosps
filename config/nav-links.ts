export type navItem = {
  name: string;
  slug: string;
  description?: string;
  role: string[];
};

export const navItems: { name: string; items: navItem[] }[] = [
  {
    name: 'Gestion piso de produccion',
    items: [
      {
        name: 'Ordenes de produccion',
        slug: 'production-orders',
        description: 'Lista ordenes de produccion para piso',
        role: ['Operario', 'Lider', 'Jefe'],
      },
      {
        name: 'Ordenes de trabajo',
        slug: 'work-orders',
        description: 'Lista ordenes de trabajo/operaciones para piso',
        role: ['Operario', 'Lider', 'Jefe'],
      },
      {
        name: 'Controles de calidad',
        slug: 'quality-control',
        description: 'Procesos de control de calidad para piso',
        role: ['Lider', 'Jefe', 'Calidad'],
      },
      {
        name: 'Notas de venta',
        slug: 'customer-sales-notes',
        description: 'Consulta de notas de venta y avance de produccion',
        role: ['Cliente', 'Jefe'],
      },
    ],
  },
];
