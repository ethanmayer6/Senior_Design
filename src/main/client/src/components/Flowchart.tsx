// src/components/Flowchart.tsx
import { useEffect, memo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
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
import type { Course as FlowchartCourse, CourseStatus, Flowchart as FlowchartEntity } from '../api/flowchartApi';
import { createStatusLookup, normalizeStatus, resolveCourseStatus } from '../utils/flowchartStatus';

type CourseData = {
  label: string;
  cls: string;
  title?: string;
  status?: CourseStatus;
  course?: FlowchartCourse;
};
type SemesterData = { title: string };

const CourseNode = memo(({ data }: NodeProps<CourseData>) => {
  const normalizedStatus = String(data.status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  const isInProgress = normalizedStatus === 'IN_PROGRESS';

  return (
    <div
      title={data.title}
      className={[
        'h-[4.5rem] w-[4.5rem] rounded-full',
        'flex items-center justify-center text-center',
        'px-1 font-semibold text-[11px] leading-tight shadow-sm cursor-pointer select-none relative',
        data.cls,
      ].join(' ')}
    >
      {data.label}
      {isInProgress && (
        <span className="absolute -bottom-1 -right-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none text-black shadow-sm">
          IP
        </span>
      )}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
});

const SemesterNode = memo(({ data }: NodeProps<SemesterData>) => (
  <div className="h-full w-full rounded-xl border border-slate-300 bg-slate-50/90 p-3 shadow-sm">
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

function normalizeCourseIdent(ident: string | undefined | null): string {
  return String(ident ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function extractPrereqs(course: FlowchartCourse): string[] {
  const explicit = Array.isArray(course.prerequisites) ? course.prerequisites.filter(Boolean) : [];
  if (explicit.length > 0) return explicit;

  const prereqText = String(course.prereq_txt ?? '').toUpperCase();
  if (!prereqText) return [];

  const prereqs: string[] = [];
  const re = /\b([A-Z]{2,8}(?:\s+[A-Z]{1,3})?)\s*[-_]?\s*(\d{4})\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(prereqText)) !== null) {
    const prefix = String(match[1] ?? '').replace(/[^A-Z]/g, '');
    const number = String(match[2] ?? '');
    if (prefix && number) prereqs.push(`${prefix}_${number}`);
  }
  return prereqs;
}

function semesterRank(year: number, term: string): number {
  const order: Record<string, number> = {
    SPRING: 1,
    SUMMER: 2,
    FALL: 3,
  };
  const termRank = order[term?.toUpperCase()] ?? 9;
  return year * 10 + termRank;
}

export default function Flowchart({
  flowchart,
  onCourseSelect,
}: {
  flowchart: FlowchartEntity;
  onCourseSelect?: (course: FlowchartCourse) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!flowchart) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const edgeIds = new Set<string>();
    const statusLookup = createStatusLookup(flowchart.courseStatusMap);
    const semesters = Array.isArray(flowchart.semesters) ? flowchart.semesters : [];
    const sortedSems = [...semesters].sort(
      (a, b) => semesterRank(a.year, a.term) - semesterRank(b.year, b.term)
    );
    const courseNodeRefsByIdent = new Map<
      string,
      Array<{ nodeId: string; semRank: number }>
    >();
    const targetNodeRefs: Array<{ nodeId: string; semRank: number; course: FlowchartCourse }> = [];

    let currentY = 0;
    sortedSems.forEach((sem) => {
      const semId = `SEM_${sem.id}`;
      const semRank = semesterRank(sem.year, sem.term);
      const semesterCourses = Array.isArray(sem.courses) ? sem.courses : [];
      const uniqueSemesterCourses = semesterCourses.filter((c, idx, arr) => {
        const ident = c?.courseIdent;
        if (!ident) return false;
        return arr.findIndex((x) => x?.courseIdent === ident) === idx;
      });
      const rowsNeeded = Math.max(1, Math.ceil(uniqueSemesterCourses.length / COURSE_PER_ROW));
      const semesterHeight = Math.max(
        MIN_SEMESTER_HEIGHT,
        INNER_PADDING_Y + rowsNeeded * COURSE_GAP_Y
      );

      newNodes.push({
        id: semId,
        type: 'semester',
        position: { x: 80, y: currentY },
        data: { title: sem.year <= 0 ? 'Transfer Credit' : `${sem.term} ${sem.year}` },
        style: { width: SEMESTER_WIDTH, height: semesterHeight },
        draggable: false,
      });

      let placedCount = 0;
      uniqueSemesterCourses.forEach((c) => {
        if (!c) return;
        const colIndex = placedCount % COURSE_PER_ROW;
        const rowIndex = Math.floor(placedCount / COURSE_PER_ROW);

        const courseIdent = c.courseIdent || `UNKNOWN_${sem.id}_${placedCount}`;
        const prefix = courseIdent.split('_')[0];
        const status = resolveCourseStatus(statusLookup, courseIdent);
        const normalizedStatus = normalizeStatus(status);
        const isCompleted = normalizedStatus === 'COMPLETED';
        const isInProgress = normalizedStatus === 'IN_PROGRESS';
        const color = deptClasses[prefix] || deptClasses.DEFAULT;
        const cls = isCompleted
          ? `${color} ring-2 ring-emerald-300`
          : isInProgress
            ? `${color} ring-2 ring-amber-300`
            : `${color} opacity-95`;
        const nodeId = `${semId}__${courseIdent}__${placedCount}`;

        newNodes.push({
          id: nodeId,
          type: 'course',
          data: {
            label: courseIdent.replace('_', ' '),
            cls,
            title: `${c.name}${status ? ` (${status})` : ''}`,
            status,
            course: c,
          },
          parentNode: semId,
          extent: 'parent',
          position: {
            x: INNER_PADDING_X + colIndex * COURSE_GAP_X,
            y: INNER_PADDING_Y + rowIndex * COURSE_GAP_Y,
          },
        });
        const normalizedIdent = normalizeCourseIdent(courseIdent);
        if (normalizedIdent) {
          if (!courseNodeRefsByIdent.has(normalizedIdent)) {
            courseNodeRefsByIdent.set(normalizedIdent, []);
          }
          courseNodeRefsByIdent.get(normalizedIdent)?.push({ nodeId, semRank });
        }
        targetNodeRefs.push({ nodeId, semRank, course: c });
        placedCount++;
      });

      currentY += semesterHeight + Y_SPACING;
    });

    targetNodeRefs.forEach(({ nodeId, semRank, course }) => {
      const prereqs = extractPrereqs(course);
      prereqs.forEach((prereqIdent) => {
        const normalizedPrereq = normalizeCourseIdent(prereqIdent);
        const normalizedTarget = normalizeCourseIdent(course.courseIdent);
        if (!normalizedPrereq || normalizedPrereq === normalizedTarget) return;

        const candidates = (courseNodeRefsByIdent.get(normalizedPrereq) ?? [])
          .filter((candidate) => candidate.semRank <= semRank)
          .sort((a, b) => b.semRank - a.semRank);
        const prereqNode = candidates[0];
        if (!prereqNode) return;

        const edgeId = `${prereqNode.nodeId}->${nodeId}`;
        if (edgeIds.has(edgeId)) return;
        edgeIds.add(edgeId);

        newEdges.push({
          id: edgeId,
          source: prereqNode.nodeId,
          target: nodeId,
          type: 'smoothstep',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#64748b' },
          style: { stroke: '#64748b', strokeWidth: 1.8 },
        });
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [flowchart, setNodes, setEdges]);

  const onConnect = (params: Edge | Connection) => setEdges((e) => addEdge(params, e));
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.type !== 'course') return;
    const nodeData = node.data as CourseData;
    if (nodeData.course && onCourseSelect) {
      onCourseSelect(nodeData.course);
    }
  };
  const hasRenderableData = nodes.length > 0;

  return (
    <div className="relative h-[80vh] min-h-[560px] w-full max-w-[980px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {!hasRenderableData && (
        <div className="absolute z-10 p-3 text-sm text-slate-600">
          Flowchart loaded, but no renderable courses were found.
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.03, minZoom: 1.1, maxZoom: 1.1 }}
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
