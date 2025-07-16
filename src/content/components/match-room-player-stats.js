import React from 'dom-chef'

const stat = (value, label) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '4px 8px',
      fontSize: '11px',
      lineHeight: '1.2',
      minWidth: '40px',
    }}
  >
    <div
      style={{
        fontWeight: 'bold',
        color: '#fff',
        fontSize: '12px',
      }}
    >
      {value}
    </div>
    <div
      style={{
        color: '#999',
        fontSize: '10px',
        textAlign: 'center',
      }}
    >
      {label}
    </div>
  </div>
)

export default ({
  matches,
  winRate,
  averageKills,
  averageKDRatio,
  averageKRRatio,
  averageHeadshots,
}) => (
  <div
    style={{
      display: 'flex',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '4px',
      padding: '4px',
      marginTop: '4px',
      gap: '2px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}
  >
    {stat(matches || 0, 'Matches')}
    {stat(`${winRate || 0}%`, 'Win Rate')}
    {stat(averageKills || 0, 'Kills')}
    {stat(averageKDRatio || '0.00', 'K/D')}
    {stat(averageKRRatio || '0.00', 'K/R')}
    {stat(`${averageHeadshots || 0}%`, 'HS%')}
  </div>
)
