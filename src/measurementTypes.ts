export type Point = { x: number; y: number; z?: number };

export interface MeasurementGroup {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export interface Measurement {
  id: string;
  groupId: string;
  tool: string;
  name?: string;
  byggdelType?: string;
  height?: number;
  multiplier?: number;
  points: Point[];
  color: string;
  value?: number;
  page?: number;
  text?: string;
  depth?: number;
  opacity?: number;
}
