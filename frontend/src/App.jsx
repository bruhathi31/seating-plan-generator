// App.jsx
import { useState } from 'react'
import './App.css'

function App() {
  const [guests, setGuests] = useState([])
  const [newGuest, setNewGuest] = useState('')
  const [groups, setGroups] = useState([])
  const [currentGroup, setCurrentGroup] = useState([])
  const [tables, setTables] = useState([{ number: 1, capacity: 8 }])
  const [seatingPlan, setSeatingPlan] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Add a guest to the list
  const addGuest = (e) => {
    e.preventDefault()
    if (!newGuest.trim()) return
    if (guests.includes(newGuest.trim())) {
      setError('Guest already added')
      return
    }
    setGuests([...guests, newGuest.trim()])
    setNewGuest('')
    setError('')
  }

  // Remove a guest from the list
  const removeGuest = (guestToRemove) => {
    setGuests(guests.filter(guest => guest !== guestToRemove))
    // Also remove from current group if present
    if (currentGroup.includes(guestToRemove)) {
      setCurrentGroup(currentGroup.filter(guest => guest !== guestToRemove))
    }
    // Also remove from any saved groups
    const updatedGroups = groups.map(group => 
      group.filter(guest => guest !== guestToRemove)
    ).filter(group => group.length > 0)
    setGroups(updatedGroups)
  }

  // Toggle selection of a guest for the current group
  const toggleGuestInGroup = (guest) => {
    if (currentGroup.includes(guest)) {
      setCurrentGroup(currentGroup.filter(g => g !== guest))
    } else {
      setCurrentGroup([...currentGroup, guest])
    }
  }

  // Save current group
  const saveGroup = () => {
    if (currentGroup.length < 2) {
      setError('A group needs at least 2 people')
      return
    }
    setGroups([...groups, [...currentGroup]])
    setCurrentGroup([])
    setError('')
  }

  // Remove a saved group
  const removeGroup = (index) => {
    setGroups(groups.filter((_, i) => i !== index))
  }

  // Add a table
  const addTable = () => {
    setTables([...tables, { number: tables.length + 1, capacity: 8 }])
  }

  // Remove a table
  const removeTable = (index) => {
    if (tables.length === 1) {
      setError('You need at least one table')
      return
    }
    setTables(tables.filter((_, i) => i !== index))
  }

  // Update table capacity
  const updateTableCapacity = (index, capacity) => {
    const updatedTables = [...tables]
    updatedTables[index].capacity = parseInt(capacity) || 1
    setTables(updatedTables)
  }

  // Generate seating plan
  const generatePlan = async () => {
    if (guests.length === 0) {
      setError('You need to add guests')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://127.0.0.1:5000/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guests: guests,
          groups: groups,
          tables_config: tables.map(table => table.capacity)
        }),
      })
      
      const data = await response.json()
      if (response.ok) {
        setSeatingPlan(data.seating_plan)
      } else {
        setError(data.error || 'Failed to generate seating plan')
        setSeatingPlan(null)
      }
    } catch (error) {
      setError('Error connecting to server: ' + error.message)
      setSeatingPlan(null)
    } finally {
      setLoading(false)
    }
  }

  // Reset everything
  const reset = () => {
    setGuests([])
    setNewGuest('')
    setGroups([])
    setCurrentGroup([])
    setTables([{ number: 1, capacity: 8 }])
    setSeatingPlan(null)
    setError('')
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Party Seating Planner</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="container">
          <div className="section">
            <h2>1. Add Guests</h2>
            <form onSubmit={addGuest} className="form-group">
              <input
                type="text"
                value={newGuest}
                onChange={(e) => setNewGuest(e.target.value)}
                placeholder="Enter guest name"
              />
              <button type="submit">Add Guest</button>
            </form>
            
            <div className="guest-list">
              <h3>Guest List ({guests.length})</h3>
              {guests.length === 0 ? (
                <p>No guests added yet</p>
              ) : (
                <ul>
                  {guests.map((guest, index) => (
                    <li key={index} className="guest-item">
                      <span>{guest}</span>
                      <div>
                        <button 
                          onClick={() => toggleGuestInGroup(guest)} 
                          className={currentGroup.includes(guest) ? "btn-selected" : ""}
                        >
                          {currentGroup.includes(guest) ? "Selected" : "Select for Group"}
                        </button>
                        <button onClick={() => removeGuest(guest)} className="btn-remove">
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <div className="section">
            <h2>2. Create Groups</h2>
            <div className="current-group">
              <h3>Current Group Selection ({currentGroup.length})</h3>
              {currentGroup.length === 0 ? (
                <p>No guests selected for this group</p>
              ) : (
                <ul>
                  {currentGroup.map((guest, index) => (
                    <li key={index}>{guest}</li>
                  ))}
                </ul>
              )}
              <button onClick={saveGroup} disabled={currentGroup.length < 2}>
                Save as Group
              </button>
            </div>
            
            <div className="saved-groups">
              <h3>Saved Groups ({groups.length})</h3>
              {groups.length === 0 ? (
                <p>No groups saved yet</p>
              ) : (
                <ul>
                  {groups.map((group, index) => (
                    <li key={index} className="group-item">
                      <span>Group {index + 1}: {group.join(", ")}</span>
                      <button onClick={() => removeGroup(index)} className="btn-remove">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <div className="section">
            <h2>3. Configure Tables</h2>
            <div className="tables-config">
              {tables.map((table, index) => (
                <div key={index} className="table-item">
                  <span>Table {table.number}</span>
                  <div className="capacity-control">
                    <label>Capacity:</label>
                    <input
                      type="number"
                      min="1"
                      value={table.capacity}
                      onChange={(e) => updateTableCapacity(index, e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => removeTable(index)} 
                    className="btn-remove"
                    disabled={tables.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button onClick={addTable} className="btn-add">
                Add Table
              </button>
            </div>
          </div>
          
          <div className="actions">
            <button onClick={generatePlan} className="btn-generate" disabled={loading}>
              {loading ? "Generating..." : "Generate Seating Plan"}
            </button>
            <button onClick={reset} className="btn-reset">
              Reset All
            </button>
          </div>
        </div>
        
        {seatingPlan && (
          <div className="seating-plan">
            <h2>Seating Plan</h2>
            <div className="tables-container">
              {seatingPlan.map((table) => (
                <div key={table.table_number} className="table">
                  <h3>Table {table.table_number}</h3>
                  <p>Capacity: {table.capacity}</p>
                  <ul>
                    {table.guests.map((guest, i) => (
                      <li key={i}>{guest}</li>
                    ))}
                  </ul>
                  {table.empty_seats > 0 && (
                    <p className="empty-seats">Empty seats: {table.empty_seats}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>
    </div>
  )
}

export default App