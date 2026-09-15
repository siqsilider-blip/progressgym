export function normalizeArgentineWhatsAppPhone(phone: string) {
    let digits = phone.replace(/\D/g, '')
    if (!digits) return null

    if (digits.startsWith('00')) digits = digits.slice(2)

    let nationalNumber = digits.startsWith('54')
        ? digits.slice(2)
        : digits

    nationalNumber = nationalNumber.replace(/^0+/, '')

    // Corrige el formato local habitual de Buenos Aires: 011 15 XXXX XXXX.
    if (nationalNumber.startsWith('1115')) {
        nationalNumber = `11${nationalNumber.slice(4)}`
    }

    if (nationalNumber.startsWith('9')) {
        return `54${nationalNumber}`
    }

    return `549${nationalNumber}`
}

export function buildWhatsAppUrl(phone: string, message?: string) {
    const normalizedPhone = normalizeArgentineWhatsAppPhone(phone)
    if (!normalizedPhone) return null

    const query = message ? `?text=${encodeURIComponent(message)}` : ''
    return `https://wa.me/${normalizedPhone}${query}`
}
