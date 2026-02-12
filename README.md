# smartRestaurant 🍽️

Una aplicación web moderna y profesional para la gestión de restaurantes, diseñada para ofrecer una experiencia fluida tanto para el personal como para los clientes.

## 🚀 Tecnologías Utilizadas

Este proyecto está construido con un stack tecnológico de vanguardia:

- **Framework:** [Next.js 15+](https://nextjs.org/) (App Router)
- **Frontend:** [React 19](https://react.dev/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI:** [Radix UI](https://www.radix-ui.com/) y [Shadcn/ui](https://ui.shadcn.com/)
- **Base de Datos & ORM:** [Prisma](https://www.prisma.io/)
- **Autenticación:** [Auth.js (NextAuth.js v5)](https://authjs.dev/)
- **Validación:** [Zod](https://zod.dev/)
- **Iconos:** [Lucide React](https://lucide.dev/)
- **Gráficos:** [Recharts](https://recharts.org/)

## 🛠️ Requisitos Previos

- **Node.js:** Versión 18 o superior.
- **Gestor de paquetes:** `npm` o `pnpm`.

## ⚙️ Configuración e Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Bigsami89/smartRestaurant.git
   cd smartRestaurant
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   # o si usas pnpm
   pnpm install
   ```

3. **Configurar el entorno:**
   Crea un archivo `.env` en la raíz del proyecto y añade las variables necesarias (Base de Datos, Secretos de Auth, etc.).
   ```env
   DATABASE_URL="file:./dev.db"
   AUTH_SECRET="tu_secreto_aqui"
   ```

4. **Preparar la Base de Datos:**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

## 🏃 Ejecución

Para iniciar el servidor de desarrollo:

```bash
npm run dev
# o
pnpm dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## 📄 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo con Turbo.
- `npm run build`: Crea la versión de producción de la aplicación.
- `npm run start`: Inicia la aplicación en modo producción.
- `npm run lint`: Ejecuta el linter para encontrar y corregir problemas de código.
- `npm run test:backend`: Ejecuta scripts de prueba para el backend.

## ✨ Funcionalidades Principales

- **Gestión de Mesas:** Control de estado (libre, ocupada, reservada, facturando).
- **Punto de Venta (POS):** Toma de pedidos directa y por mesas, manejo de propinas y métodos de pago.
- **Inventario:** Control de productos, insumos y movimientos de stock.
- **Cocina:** Interfaz en tiempo real para la preparación de pedidos.
- **Reservaciones:** Sistema de reservas con validación de horarios.
- **Administración:** Gestión de empleados, sucursales y reportes de ventas.
- **Corte de Caja:** Apertura y cierre de turnos con balance de efectivo y tarjeta.

## 🚧 Funcionalidades Faltantes (Roadmap)

- [ ] **Facturación Electrónica:** Integración con servicios de facturación local.
- [ ] **Notificaciones Push:** Avisos a meseros cuando los platillos estén listos.
- [ ] **Módulo de Proveedores:** Gestión de compras y cuentas por pagar.
- [ ] **App de Comanda Móvil:** Optimización de la interfaz para dispositivos móviles de meseros.
- [ ] **Fidelización de Clientes:** Sistema de puntos y descuentos por cliente frecuente.
- [ ] **Multi-idioma:** Soporte para inglés y otros idiomas.

## 🔍 Áreas por Buscar / Investigar

- **Optimización de Consultas:** Revisar el rendimiento de Prisma en reportes de ventas históricos de gran volumen.
- **Escalabilidad WebSockets:** Evaluar la implementación de actualizaciones en tiempo real (Socket.io o alternativas) para mayor concurrencia en cocina.
- **Seguridad Avanzada:** Auditoría de roles y permisos granulares por sucursal.
- **Integración con Hardware:** Impresoras térmicas (protocolo ESC/POS) para tickets de cocina y clientes.

---
Desarrollado con ❤️ para la gestión inteligente de restaurantes.
