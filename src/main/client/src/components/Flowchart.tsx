// src/components/Flowchart.tsx
import { useEffect, memo } from 'react';
import ReactFlow, {
  Background,
  Controls,
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
      'w-14 h-14 rounded-full',
      'flex items-center justify-center text-center',
      'font-semibold text-xs shadow-sm cursor-default select-none',
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
    className="rounded-xl border border-gray-400 bg-gray-50 p-2 shadow-sm"
    style={{ width: 600, height: 120 }}
  >
    <div className="text-sm font-bold text-gray-700 mb-1">{data.title}</div>
  </div>
));

const nodeTypes = {
  course: CourseNode,
  semester: SemesterNode,
};

const Y_SPACING = 150;

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

    sortedSems.forEach((sem, row) => {
      const semId = `SEM_${sem.id}`;

      newNodes.push({
        id: semId,
        type: 'semester',
        position: { x: 200, y: row * Y_SPACING },
        data: { title: `${sem.term} ${sem.year}` },
        style: { width: 600, height: 140 },
        draggable: false,
      });

      // --- Make grid layout inside each semester ---
      const columns = 6; // max courses per row
      const spacingX = 90;

      sem.courses.forEach((c, index) => {
        const colIndex = index % columns;

        const courseIdent = c.courseIdent;
        const prefix = courseIdent.split('_')[0];
        const isCompleted = flowchart.courseStatusMap?.[courseIdent] === 'COMPLETED';
        const color = deptClasses[prefix] || deptClasses.DEFAULT;
        const cls = isCompleted ? `${color} opacity-100` : color;

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
            x: 50 + colIndex * spacingX,
            y: 40,
          },
        });

        c.prerequisites?.forEach((p) => {
          newEdges.push({
            id: `${p}->${courseIdent}`,
            source: p,
            target: courseIdent,
            type: 'smoothstep',
          });
        });
      });

      newNodes.push({
        id: semId,
        type: 'semester',
        position: { x: 200, y: row * Y_SPACING },
        data: { title: `${sem.term} ${sem.year}` },
        style: { width: 600, height: 140 },
        draggable: false,
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [flowchart]);

  const onConnect = (params: Edge | Connection) => setEdges((e) => addEdge(params, e));

  return (
    <div className="flex h-[85vh] w-[100vh] border rounded">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Controls />
        <Background gap={12} />
      </ReactFlow>
    </div>
  );
}
