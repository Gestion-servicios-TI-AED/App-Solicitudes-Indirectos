"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  razonSocial: string;
  nit: string;
  representanteLegal: string;
  cedulaRepresentante: string;
  correoFirma: string;
  direccionRepresentante: string;
  telefonoRepresentante: string;
  nombreContacto: string;
  telefonoContacto: string;
  correoContacto: string;
  tipoContrato: string;
}

interface FormErrors {
  [key: string]: string;
}

const TIPO_CONTRATO_OPTIONS = [
  { value: "OBRA", label: "Obra" },
  { value: "DISENO", label: "Diseño" },
  { value: "SERVICIOS", label: "Servicios" },
];

// NIT format: XXXXXXXXX-X
const NIT_REGEX = /^\d{6,10}-\d$/;

// ─── Component ────────────────────────────────────────────────────────────────

export default function NuevoTerceroPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState<FormData>({
    razonSocial: "",
    nit: "",
    representanteLegal: "",
    cedulaRepresentante: "",
    correoFirma: "",
    direccionRepresentante: "",
    telefonoRepresentante: "",
    nombreContacto: "",
    telefonoContacto: "",
    correoContacto: "",
    tipoContrato: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!form.razonSocial.trim()) newErrors.razonSocial = "La razón social es obligatoria";
    if (!form.nit.trim()) {
      newErrors.nit = "El NIT es obligatorio";
    } else if (!NIT_REGEX.test(form.nit.trim())) {
      newErrors.nit = "Formato inválido. Use XXXXXXXXX-X (ej. 900123456-7)";
    }
    if (!form.representanteLegal.trim())
      newErrors.representanteLegal = "El representante legal es obligatorio";
    if (!form.cedulaRepresentante.trim())
      newErrors.cedulaRepresentante = "La cédula del RL es obligatoria";
    if (!form.correoFirma.trim()) {
      newErrors.correoFirma = "El correo de firma es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correoFirma)) {
      newErrors.correoFirma = "Correo electrónico inválido";
    }
    if (!form.direccionRepresentante.trim())
      newErrors.direccionRepresentante = "La dirección es obligatoria";
    if (!form.telefonoRepresentante.trim())
      newErrors.telefonoRepresentante = "El teléfono es obligatorio";
    if (!form.tipoContrato)
      newErrors.tipoContrato = "Selecciona el tipo de contrato";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/terceros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nombreContacto: form.nombreContacto || undefined,
          telefonoContacto: form.telefonoContacto || undefined,
          correoContacto: form.correoContacto || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error ?? "Error al crear el tercero", "error");
        return;
      }

      addToast("Tercero creado exitosamente", "success");
      router.push(`/terceros/${data.id}`);
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <div>
        <Link
          href="/terceros"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver a Terceros
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Tercero</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Registra los datos del proveedor o contratista.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Datos básicos */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Datos del Tercero
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="razonSocial"
              label="Razón Social"
              required
              value={form.razonSocial}
              onChange={handleChange}
              error={errors.razonSocial}
              placeholder="Nombre de la empresa"
            />
            <Input
              name="nit"
              label="NIT"
              required
              value={form.nit}
              onChange={handleChange}
              error={errors.nit}
              placeholder="900123456-7"
            />
          </div>

          <Select
            name="tipoContrato"
            label="Tipo de Contrato"
            required
            options={TIPO_CONTRATO_OPTIONS}
            placeholder="Selecciona un tipo"
            value={form.tipoContrato}
            onChange={handleChange}
            error={errors.tipoContrato}
          />
        </div>

        {/* Representante Legal */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Representante Legal
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="representanteLegal"
              label="Nombre del Representante Legal"
              required
              value={form.representanteLegal}
              onChange={handleChange}
              error={errors.representanteLegal}
              placeholder="Nombre completo"
            />
            <Input
              name="cedulaRepresentante"
              label="Cédula del RL"
              required
              value={form.cedulaRepresentante}
              onChange={handleChange}
              error={errors.cedulaRepresentante}
              placeholder="Número de cédula"
            />
          </div>

          <Input
            name="correoFirma"
            label="Correo para Firma"
            type="email"
            required
            value={form.correoFirma}
            onChange={handleChange}
            error={errors.correoFirma}
            placeholder="correo@empresa.com"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="direccionRepresentante"
              label="Dirección del RL"
              required
              value={form.direccionRepresentante}
              onChange={handleChange}
              error={errors.direccionRepresentante}
              placeholder="Dirección completa"
            />
            <Input
              name="telefonoRepresentante"
              label="Teléfono del RL"
              required
              value={form.telefonoRepresentante}
              onChange={handleChange}
              error={errors.telefonoRepresentante}
              placeholder="+57 300 000 0000"
            />
          </div>
        </div>

        {/* Contacto (opcional) */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Contacto Comercial
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Información opcional de contacto.</p>
          </div>

          <Input
            name="nombreContacto"
            label="Nombre del Contacto"
            value={form.nombreContacto}
            onChange={handleChange}
            placeholder="Nombre completo"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="telefonoContacto"
              label="Teléfono del Contacto"
              value={form.telefonoContacto}
              onChange={handleChange}
              placeholder="+57 300 000 0000"
            />
            <Input
              name="correoContacto"
              label="Correo del Contacto"
              type="email"
              value={form.correoContacto}
              onChange={handleChange}
              placeholder="contacto@empresa.com"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/terceros">
            <Button type="button" variant="secondary" disabled={loading}>
              Cancelar
            </Button>
          </Link>
          <Button type="submit" loading={loading}>
            Guardar Tercero
          </Button>
        </div>
      </form>
    </div>
  );
}
