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

---
Desarrollado con ❤️ para la gestión inteligente de restaurantes.
