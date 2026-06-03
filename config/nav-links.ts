export type navItem = {
  name: string;
  slug: string;
  description?: string;
  role: any[]
};

export const navItems: { name: string; items: navItem[] }[] = [
  {
    name: 'Gestión piso de producción',
    items: [

      {
        name: 'Órdenes de producción',
        slug: 'production-orders',
        description: 'Lista órdenes de produccion para piso',
        role: ['Operario', 'Lider', 'Jefe']
      },
      {
        name: 'Órdenes de trabajo',
        slug: 'work-orders',
        description: 'Lista órdenes de trabajo/operaciones para piso',
        role: ['Operario', 'Lider', 'Jefe']
      },
      // {
      //   name: 'Plan de producción',
      //   slug: '',
      //   description: 'Lista los planes de producción activos',
      // },
      {
        name: 'Controles de calidad',
        slug: 'quality-control',
        description: 'Procesos de control de calidad para piso',
        role: ['Lider', 'Jefe','Calidad']
      },
      {
        name: 'Notas de venta',
        slug: 'customer-sales-notes',
        description: 'Consulta de notas de venta y avance de produccion',
        role: ['Cliente']
      },
      //{
      //  name: 'Planificación',
      //  slug: '',
      //  description: 'Planificación',
      //  role: ['Lider', 'Jefe']
      //},
    ],
  },
];
