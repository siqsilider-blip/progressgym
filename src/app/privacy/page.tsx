import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'
import { SUPPORT_EMAIL } from '@/lib/public-config'

export const metadata: Metadata = {
    title: 'Política de privacidad | Progrezzia',
    description: 'Cómo Progrezzia recopila, usa y protege tus datos.',
}

export default function PrivacyPage() {
    return (
        <LegalPage
            title="Política de privacidad"
            description="Esta política explica qué información utiliza Progrezzia para brindar el servicio de entrenamiento y cómo podés ejercer tus derechos."
            updatedAt="27 de septiembre de 2026"
            sections={[
                {
                    title: '1. Información que tratamos',
                    items: [
                        'Datos de cuenta y contacto: nombre, correo electrónico y, cuando se proporciona, teléfono.',
                        'Datos del servicio: entrenador asignado, rutinas, ejercicios, cargas, repeticiones, esfuerzo percibido, sesiones e historial de progreso.',
                        'Datos opcionales de seguimiento: energía, descanso, estrés, molestias, peso, cintura y fotografías de progreso que el alumno decida cargar.',
                        'Datos profesionales del entrenador: nombre público, gimnasio, preferencias y configuración del servicio.',
                        'Datos técnicos indispensables para iniciar sesión, mantener la seguridad y diagnosticar errores.',
                    ],
                },
                {
                    title: '2. Para qué usamos los datos',
                    items: [
                        'Crear y proteger la cuenta.',
                        'Permitir que el entrenador asigne programas y acompañe el progreso de sus alumnos.',
                        'Registrar entrenamientos, mostrar historial y mantener la continuidad del servicio.',
                        'Responder consultas, prevenir abusos y mejorar la estabilidad de la aplicación.',
                    ],
                },
                {
                    title: '3. Proveedores y transferencias',
                    paragraphs: [
                        'Usamos Supabase para autenticación y almacenamiento de datos, y Vercel para alojar y entregar la aplicación. Estos proveedores procesan información únicamente para prestar su servicio. Progrezzia no vende datos personales, no utiliza publicidad de terceros y no realiza seguimiento entre aplicaciones con fines publicitarios.',
                    ],
                },
                {
                    title: '4. Quién puede ver la información',
                    paragraphs: [
                        'Cada alumno puede acceder a su propia cuenta y entrenamiento. El entrenador vinculado puede consultar la información necesaria para preparar rutinas y hacer seguimiento. Las fotografías de progreso se almacenan de forma privada y no tienen una dirección pública permanente. Aplicamos controles de acceso para separar los datos de cada entrenador y alumno.',
                    ],
                },
                {
                    title: '5. Fotografías y uso en redes sociales',
                    paragraphs: [
                        'Cargar fotografías de progreso es siempre opcional. Una foto privada puede ser vista por el alumno y su entrenador vinculado únicamente para seguimiento.',
                        'El uso de una fotografía en redes sociales requiere una autorización adicional, voluntaria e individual del alumno. No autorizar su publicación no afecta el acceso al entrenamiento. El alumno puede retirar esa autorización desde la aplicación; desde ese momento no deberá utilizarse en nuevas publicaciones. La revocación no elimina automáticamente publicaciones realizadas legítimamente antes del retiro, por lo que también puede solicitarse su remoción al entrenador o al contacto de soporte.',
                    ],
                },
                {
                    title: '6. Conservación y eliminación',
                    paragraphs: [
                        'Conservamos la información mientras la cuenta esté activa. Las fotografías pueden eliminarse individualmente desde Progreso. También podés iniciar la eliminación definitiva desde Configuración o Perfil. La solicitud se procesa dentro de 7 días y elimina la cuenta y sus datos asociados, salvo aquello que debamos conservar por una obligación legal aplicable.',
                    ],
                },
                {
                    title: '7. Tus derechos',
                    paragraphs: [
                        `Podés solicitar acceso, corrección o eliminación de tus datos escribiendo a ${SUPPORT_EMAIL}. También podés eliminar la cuenta directamente desde la aplicación.`,
                    ],
                },
                {
                    title: '8. Menores y salud',
                    paragraphs: [
                        'Progrezzia está dirigida a personas adultas. La aplicación registra información de actividad física, pero no brinda diagnósticos médicos ni reemplaza la consulta con profesionales de la salud.',
                    ],
                },
                {
                    title: '9. Contacto',
                    paragraphs: [`Para consultas de privacidad o seguridad: ${SUPPORT_EMAIL}.`],
                },
            ]}
        />
    )
}
