import Avatar from './Avatar.jsx'

export default function Roster({ team }) {
  return (
    <section className="roster" aria-label={`${team.name} starting eleven`}>
      <h3>{team.name} — starting XI</h3>
      <div className="coach">
        <Avatar name={team.coach.name} src={team.coach.photo} size={40} />
        <div className="who">
          <div className="nm">{team.coach.name}</div>
          <div className="role">Coach</div>
        </div>
      </div>
      <div className="players">
        {team.xi.map((p) => (
          <div className="player" key={p.name}>
            <Avatar name={p.name} src={p.photo} size={26} />
            <span className="nm">{p.name}</span>
            <span className="pos">{p.pos}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
