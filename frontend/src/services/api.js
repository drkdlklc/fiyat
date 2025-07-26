// API service for backend communication
const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/api` || 'http://localhost:8001/api';

class ApiService {
  // Paper Types API
  async getPaperTypes() {
    try {
      const response = await fetch(`${API_BASE_URL}/paper-types`);
      if (!response.ok) throw new Error('Failed to fetch paper types');
      return await response.json();
    } catch (error) {
      console.error('Error fetching paper types:', error);
      throw error;
    }
  }

  async createPaperType(paperType) {
    try {
      const response = await fetch(`${API_BASE_URL}/paper-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paperType),
      });
      if (!response.ok) throw new Error('Failed to create paper type');
      return await response.json();
    } catch (error) {
      console.error('Error creating paper type:', error);
      throw error;
    }
  }

  async updatePaperType(id, paperType) {
    try {
      const response = await fetch(`${API_BASE_URL}/paper-types/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paperType),
      });
      if (!response.ok) throw new Error('Failed to update paper type');
      return await response.json();
    } catch (error) {
      console.error('Error updating paper type:', error);
      throw error;
    }
  }

  async deletePaperType(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/paper-types/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete paper type');
      return await response.json();
    } catch (error) {
      console.error('Error deleting paper type:', error);
      throw error;
    }
  }

  // Machines API
  async getMachines() {
    try {
      const response = await fetch(`${API_BASE_URL}/machines`);
      if (!response.ok) throw new Error('Failed to fetch machines');
      return await response.json();
    } catch (error) {
      console.error('Error fetching machines:', error);
      throw error;
    }
  }

  async createMachine(machine) {
    try {
      const response = await fetch(`${API_BASE_URL}/machines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(machine),
      });
      if (!response.ok) throw new Error('Failed to create machine');
      return await response.json();
    } catch (error) {
      console.error('Error creating machine:', error);
      throw error;
    }
  }

  async updateMachine(id, machine) {
    try {
      const response = await fetch(`${API_BASE_URL}/machines/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(machine),
      });
      if (!response.ok) throw new Error('Failed to update machine');
      return await response.json();
    } catch (error) {
      console.error('Error updating machine:', error);
      throw error;
    }
  }

  async deleteMachine(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/machines/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete machine');
      return await response.json();
    } catch (error) {
      console.error('Error deleting machine:', error);
      throw error;
    }
  }

  // Initialize default data
  async initializeData() {
    try {
      const response = await fetch(`${API_BASE_URL}/initialize-data`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to initialize data');
      return await response.json();
    } catch (error) {
      console.error('Error initializing data:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();