import React from 'react'
import { DFMPanel } from './DFMPanel'
import { Part, DFMResult } from '@/lib/hooks/use-quote-store'

// Mock data for testing
const mockPart: Part = {
  id: 'test-part-1',
  name: 'Test Bracket.STEP',
  file: new File([''], 'Test Bracket.STEP'),
  status: 'ready',
  process: 'cnc'
}

const mockDFMResults: DFMResult[] = [
  {
    id: 'dfm-1',
    severity: 'blocker',
    code: 'MIN_WALL_THICKNESS',
    message: 'Wall thickness is below minimum requirement of 1.5mm',
    location: { x: 10.5, y: 20.3, z: 5.1 },
    suggestion: 'Increase wall thickness to at least 1.5mm',
    autoFix: { action: 'offset', value: 0.5 }
  },
  {
    id: 'dfm-2',
    severity: 'warning',
    code: 'TIGHT_TOLERANCE',
    message: 'Tight tolerance may increase manufacturing cost',
    suggestion: 'Consider relaxing tolerance to ±0.1mm'
  },
  {
    id: 'dfm-3',
    severity: 'info',
    code: 'OPTIMIZATION',
    message: 'Part can be optimized for better material usage',
    suggestion: 'Consider hollowing out internal features'
  }
]

export const TestDFMPanel = () => {
  const handleFixIssue = (issueId: string, fix: any) => {
    console.log('Fixing issue:', issueId, fix)
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">DFM Panel Test</h2>
      <DFMPanel
        part={mockPart}
        dfmResults={mockDFMResults}
        onFixIssue={handleFixIssue}
      />
    </div>
  )
}
