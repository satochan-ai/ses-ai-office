import s from "./OfficeFloor.module.css";

const branchesByFloor = { "1f": ["strategy", "analytics", "recruit", "search", "network", "matching", "follow"], "2f": ["relation", "proposal", "contract", "knowledge"] };

export default function OfficePath({ floorId }: { floorId: "1f" | "2f" }) {
  return <div className={s.pathLayer} aria-hidden="true">
    <div className={s.mainAisle}><span>MAIN WALKWAY</span></div>
    <div className={s.northAisle}><span>NORTH ROUTE</span></div>
    <div className={s.southAisle}><span>SOUTH ROUTE</span></div>
    {branchesByFloor[floorId].map(id => <i key={id} className={`${s.branchPath} ${s[`branch_${id}`]}`} />)}
    {floorId === "1f" && <div className={s.reception}><strong>RECEPTION</strong><span>案件受付端末</span></div>}
    <div className={s.elevator}><strong>ELEVATOR</strong><span>{floorId === "1f" ? "2Fへ" : "1Fへ"}</span></div>
  </div>;
}
