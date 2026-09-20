import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import { SUPPORT_EMAIL } from '@/lib/public-config'

export const metadata: Metadata = {
    title: 'Términos de uso | Progrezzia',
    description: 'Condiciones de uso de Progrezzia.',
}

export default function TermsPage() {
    return (
        <LegalPage
            title="Términos de uso"
            description="Estas condiciones regulan el acceso y uso de Progrezzia por entrenadores y alumnos."
            updatedAt="20 de septiembre de 2026"
            sections={[
                {
                    title: '1. El servicio',
                    paragraphs: ['Progrezzia permite crear y asignar rutinas, registrar entrenamientos y consultar progreso. Algunas funciones dependen de que exista una vinculación activa entre entrenador y alumno.'],
                },
                {
                    title: '2. Cuentas',
                    paragraphs: ['Debés brindar información correcta, mantener la confidencialidad de tus credenciales y avisarnos ante un acceso no autorizado. No podés usar una cuenta ajena ni intentar acceder a información que no te corresponda.'],
                },
                {
                    title: '3. Entrenamiento y salud',
                    paragraphs: ['La aplicación es una herramienta de organización y seguimiento. No ofrece diagnóstico, tratamiento médico ni atención de emergencias. Cada entrenador es responsable del contenido que asigna y cada usuario debe consultar a un profesional de la salud cuando corresponda.'],
                },
                {
                    title: '4. Uso aceptable',
                    items: [
                        'No interferir con la seguridad o disponibilidad del servicio.',
                        'No cargar contenido ilegal, engañoso o que vulnere derechos de terceros.',
                        'No extraer datos de otros usuarios ni utilizar la aplicación con fines abusivos.',
                    ],
                },
                {
                    title: '5. Disponibilidad y cambios',
                    paragraphs: ['Trabajamos para mantener Progrezzia disponible y segura, pero pueden existir mantenimientos o interrupciones. Podemos mejorar, modificar o discontinuar funciones, procurando informar los cambios relevantes.'],
                },
                {
                    title: '6. Contenido y propiedad intelectual',
                    paragraphs: ['El usuario conserva los derechos sobre el contenido que incorpora. El software, la marca y el diseño de Progrezzia pertenecen a sus titulares y no pueden copiarse o redistribuirse sin autorización.'],
                },
                {
                    title: '7. Baja de la cuenta',
                    paragraphs: ['Podés dejar de usar el servicio o solicitar la eliminación definitiva de tu cuenta desde la propia aplicación. La eliminación no puede deshacerse.'],
                },
                {
                    title: '8. Contacto y ley aplicable',
                    paragraphs: [`Para consultas escribí a ${SUPPORT_EMAIL}. Estas condiciones se interpretan conforme a las leyes de la República Argentina, sin afectar los derechos irrenunciables que correspondan al consumidor.`],
                },
            ]}
        />
    )
}
