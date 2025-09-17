'use client'

import { type ReactElement } from 'react'
import dynamic from 'next/dynamic'

const QAPTemplatesList = dynamic(() => import('./QAPTemplatesList'), {
  ssr: false,
})

export default function QAPTemplatesPage(): ReactElement {
  return <QAPTemplatesList />
}
