import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import { SUPPORT_EMAIL } from '@/lib/public-config'

export const metadata: Metadata = {
    title: 'Eliminar cuenta | Progrezzia',
    description: 'Cómo eliminar definitivamente una cuenta de Progrezzia.',
}

export default async function AccountDeletionPage({ searchParams }: { searchParams: Promise<{ requested?: string; pending?: string; verification?: string }> }) {
    const params = await searchParams
    return (
        <>
        {params.requested === '1' && (
            <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-emerald-500/30 bg-emerald-950/95 p-4 text-sm text-emerald-100 shadow-2xl">
                Solicitud registrada. Cerramos tu sesión y programamos la eliminación para dentro de 7 días.
            </div>
        )}
        {params.pending === '1' && (
            <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-amber-500/30 bg-amber-950/95 p-4 text-sm text-amber-100 shadow-2xl">
                Tu solicitud está pendiente. Si necesitás cancelarla, contactá a soporte antes de la fecha programada.
            </div>
        )}
        {params.verification === '1' && (
            <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-red-500/30 bg-red-950/95 p-4 text-sm text-red-100 shadow-2xl">
                No pudimos verificar el estado de la cuenta de forma segura. No iniciamos sesión; intentá nuevamente en unos minutos.
            </div>
        )}
        <LegalPage
            title="Eliminar tu cuenta"
            description="Podés iniciar la eliminación definitiva sin contactar a soporte. Se programa para 7 días después de solicitarla."
            updatedAt="17 de noviembre de 2026"
            sections={[
                {
                    title: 'Desde una cuenta de entrenador',
                    items: ['Abrí Configuración.', 'Entrá en Cuenta.', 'Elegí “Eliminar cuenta” y confirmá escribiendo ELIMINAR.', 'La app cerrará tu sesión y registrará la solicitud.'],
                },
                {
                    title: 'Desde una cuenta de alumno',
                    items: ['Abrí Perfil.', 'Elegí “Eliminar cuenta” y confirmá escribiendo ELIMINAR.', 'La app cerrará tu sesión y registrará la solicitud.'],
                },
                {
                    title: 'Qué se elimina',
                    paragraphs: ['Se eliminan el acceso, el perfil, las fotos privadas y la información asociada a la cuenta. Una vez completado, el proceso es definitivo.'],
                },
                {
                    title: 'Si sos entrenador',
                    paragraphs: ['Nunca eliminamos las cuentas personales de tus alumnos. Si todavía tenés alumnos vinculados, la solicitud queda en revisión hasta que soporte pueda transferir o resolver esos vínculos de forma segura.'],
                },
                {
                    title: 'Si no podés ingresar',
                    paragraphs: [`Escribí desde el correo de tu cuenta a ${SUPPORT_EMAIL}. Verificaremos la identidad antes de procesar la solicitud.`],
                },
            ]}
        />
        </>
    )
}
