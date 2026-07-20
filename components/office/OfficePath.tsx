import s from "./OfficeFloor.module.css";

const branches = ["strategy", "analytics", "recruit", "search", "network", "matching", "follow"];

export default function OfficePath() {
  return <div className={s.pathLayer} aria-hidden="true">
    <div className={s.mainAisle}><span>MAIN WALKWAY</span></div>
    <div className={s.northAisle}><span>NORTH ROUTE</span></div>
    <div className={s.southAisle}><span>SOUTH ROUTE</span></div>
    {branches.map(id => <i key={id} className={`${s.branchPath} ${s[`branch_${id}`]}`} />)}
    <div className={s.reception}><strong>RECEPTION</strong><span>案件受付端末</span></div>
  </div>;
}
