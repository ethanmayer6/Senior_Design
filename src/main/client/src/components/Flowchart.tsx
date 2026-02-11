// src/components/Flowchart.tsx
import { useEffect, memo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
} from 'reactflow';

import 'reactflow/dist/style.css';
import type { Flowchart as FlowchartEntity } from '../api/flowchartApi';

type CourseData = { label: string; cls: string; title?: string };
type SemesterData = { title: string };

const CourseNode = memo(({ data }: NodeProps<CourseData>) => (
  <div
    title={data.title}
    className={[
      'h-[4.5rem] w-[4.5rem] rounded-full',
      'flex items-center justify-center text-center',
      'px-1 font-semibold text-[11px] leading-tight shadow-sm cursor-default select-none',
      data.cls,
    ].join(' ')}
  >
    {data.label}
    <Handle type="target" position={Position.Top} className="opacity-0" />
    <Handle type="source" position={Position.Bottom} className="opacity-0" />
  </div>
));

const SemesterNode = memo(({ data }: NodeProps<SemesterData>) => (
  <div
    className="rounded-xl border border-slate-300 bg-slate-50/90 p-3 shadow-sm"
    style={{ width: 760, height: 150 }}
  >
    <div className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-700">{data.title}</div>
  </div>
));

const nodeTypes = {
  course: CourseNode,
  semester: SemesterNode,
};

const SEMESTER_WIDTH = 760;
const COURSE_PER_ROW = 8;
const COURSE_GAP_X = 84;
const COURSE_GAP_Y = 94;
const INNER_PADDING_X = 38;
const INNER_PADDING_Y = 38;
const MIN_SEMESTER_HEIGHT = 150;
const Y_SPACING = 42;

const deptClasses: Record<string, string> = {
  COMS: 'bg-sky-500 text-white',
  SE: 'bg-rose-500 text-white',
  CPRE: 'bg-orange-400 text-white',
  MATH: 'bg-pink-400 text-white',
  PHYS: 'bg-green-400 text-white',
  ENGL: 'bg-yellow-300 text-black',
  STAT: 'bg-purple-500 text-white',
  CHEM: 'bg-emerald-400 text-white',
  ECON: 'bg-cyan-400 text-white',
  LIB: 'bg-blue-400 text-white',
  IE: 'bg-amber-500 text-white',
  SPCM: 'bg-amber-300 text-black',
  ART: 'bg-indigo-400 text-white',
  DEFAULT: 'bg-gray-400 text-white',
};

function semesterRank(year: number, term: string): number {
  const order: Record<string, number> = {
    SPRING: 1,
    SUMMER: 2,
    FALL: 3,
  };
  const termRank = order[term?.toUpperCase()] ?? 9;
  return year * 10 + termRank;
}

export default function Flowchart({ flowchart }: { flowchart: FlowchartEntity }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!flowchart) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    const semesters = flowchart.semesters ?? [];
    const sortedSems = [...semesters].sort(
      (a, b) => semesterRank(a.year, a.term) - semesterRank(b.year, b.term)
    );

    let currentY = 0;
    sortedSems.forEach((sem) => {
      const semId = `SEM_${sem.id}`;
      const rowsNeeded = Math.max(1, Math.ceil(sem.courses.length / COURSE_PER_ROW));
      const semesterHeight = Math.max(
        MIN_SEMESTER_HEIGHT,
        INNER_PADDING_Y + rowsNeeded * COURSE_GAP_Y
      );

      newNodes.push({
        id: semId,
        type: 'semester',
        position: { x: 80, y: currentY },
        data: { title: `${sem.term} ${sem.year}` },
        style: { width: SEMESTER_WIDTH, height: semesterHeight },
        draggable: false,
      });

      sem.courses.forEach((c, index) => {
        const colIndex = index % COURSE_PER_ROW;
        const rowIndex = Math.floor(index / COURSE_PER_ROW);

        const courseIdent = c.courseIdent;
        const prefix = courseIdent.split('_')[0];
        const isCompleted = flowchart.courseStatusMap?.[courseIdent] === 'COMPLETED';
        const color = deptClasses[prefix] || deptClasses.DEFAULT;
        const cls = isCompleted ? `${color} ring-2 ring-emerald-300` : `${color} opacity-95`;

        newNodes.push({
          id: courseIdent,
          type: 'course',
          data: {
            label: courseIdent.replace('_', ' '),
            cls,
            title: c.name,
          },
          parentNode: semId,
          extent: 'parent',
          position: {
            x: INNER_PADDING_X + colIndex * COURSE_GAP_X,
            y: INNER_PADDING_Y + rowIndex * COURSE_GAP_Y,
          },
        });

        c.prerequisites?.forEach((p) => {
          newEdges.push({
            id: `${p}->${courseIdent}`,
            source: p,
            target: courseIdent,
            type: 'smoothstep',
            animated: !isCompleted,
            style: { stroke: '#64748b', strokeWidth: 1.5 },
          });
        });
      });

      currentY += semesterHeight + Y_SPACING;
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [flowchart]);

  const onConnect = (params: Edge | Connection) => setEdges((e) => addEdge(params, e));

  return (
    <div className="h-[80vh] min-h-[560px] w-full max-w-[980px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap
          zoomable
          pannable
          nodeColor={(node: Node) => (node.type === 'semester' ? '#cbd5e1' : '#60a5fa')}
          className="!bg-white"
        />
        <Controls />
        <Background gap={14} color="#e2e8f0" />
      </ReactFlow>
    </div>
  );
}
