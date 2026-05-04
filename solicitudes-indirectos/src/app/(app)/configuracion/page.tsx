"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Users, MapPin, Settings } from "lucide-react";

const CARDS = [
  {
    title: "Usuarios y Roles",
    description: "Gestiona los usuarios del sistema, sus perfiles y frentes asignados.",
    href: "/configuracion/usuarios",
    icon: Users,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Proyectos y Frentes",
    description: "Consulta los proyectos activos y los usuarios asignados a cada frente.",
    href: "/configuracion/frentes",
    icon: MapPin,
    color: "bg-purple-50 text-purple-600",
  },
];

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.rol;

  if (userRole && userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm">
          <Settings size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            No tienes permiso para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Administración del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${card.color}`}
              >
                <Icon size={22} />
              </div>
              <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                {card.title}
              </h2>
              <p className="text-sm text-gray-500 mt-1 leading-snug">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
