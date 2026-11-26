import { getAppearance } from '@/lib/serverAppearance'
import AppearanceOptions from './AppearanceOptions'

export default async function AppearanceSelector() {
    return <AppearanceOptions appearance={await getAppearance()} />
}
