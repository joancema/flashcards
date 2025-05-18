import './style.css'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mvkqxfphaxxypjmcvyuu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12a3F4ZnBoYXh4eXBqbWN2eXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MDAxOTcsImV4cCI6MjA2MzA3NjE5N30.ETlcGwtHUkBDO78c4s-Ts8YRx1p7rl6dBQ3pKSnYrC0'
const supabase = createClient(supabaseUrl, supabaseKey)

interface FlashcardCategory {
  category_id: number
  categories: {
    name: string
  }
}

interface Flashcard {
  id: number
  question: string
  answer: string
  image_url: string | null
  created_at: string
  updated_at: string
  flashcard_categories: FlashcardCategory[]
}

// interface Category {
//   id: number
//   name: string
// }

// interface FlashcardView {
//   id: number
//   flashcard_id: number
//   viewed_at: string
// }

// UI Elements
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div class="container">
    <h1>Flashcards Manager</h1>
    
    <button id="showCreateModalButton" class="main-action-button">Create New Flashcard</button>

    <div id="createModal" class="modal hidden">
      <div class="modal-content">
        <h2>Create New Flashcard</h2>
        <form id="flashcardForm">
          <div class="form-group">
            <label for="question">Question:</label>
            <textarea id="question" required></textarea>
          </div>
          <div class="form-group">
            <label for="answer">Answer:</label>
            <textarea id="answer" required></textarea>
          </div>
          <div class="form-group">
            <label for="imageUrl">Image URL:</label>
            <input type="url" id="imageUrl">
          </div>
          <div class="form-group">
            <label for="categories">Categories:</label>
            <select id="categories" multiple>
              <!-- Categories will be populated dynamically -->
            </select>
          </div>
          <div class="modal-buttons">
            <button type="submit">Create Flashcard</button>
            <button type="button" id="closeCreateModal">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <div class="flashcards-container">
      <h2>Your Flashcards</h2>
      <div id="flashcardsList"></div>
    </div>

    <div class="study-mode-trigger">
      <button id="startStudy" class="main-action-button">Start Study Session</button>
    </div>

    <div id="studyModal" class="modal hidden">
      <div class="modal-content">
        <h2>Study Mode</h2>
        <div id="studyCard">
          <div class="card">
            <div class="card-front"></div>
            <div class="card-back"></div>
          </div>
        </div>
        <div class="study-controls">
          <button id="flipCard">Flip Card</button>
          <button id="nextCard">Next Card</button>
        </div>
        <div class="modal-buttons">
          <button type="button" id="closeStudyModal">End Study Session</button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div id="editModal" class="modal hidden">
      <div class="modal-content">
        <h2>Edit Flashcard</h2>
        <form id="editForm">
          <input type="hidden" id="editId">
          <div class="form-group">
            <label for="editQuestion">Question:</label>
            <textarea id="editQuestion" required></textarea>
          </div>
          <div class="form-group">
            <label for="editAnswer">Answer:</label>
            <textarea id="editAnswer" required></textarea>
          </div>
          <div class="form-group">
            <label for="editImageUrl">Image URL:</label>
            <input type="url" id="editImageUrl">
          </div>
          <div class="form-group">
            <label for="editCategories">Categories:</label>
            <select id="editCategories" multiple>
              <!-- Categories will be populated dynamically -->
            </select>
          </div>
          <div class="modal-buttons">
            <button type="submit">Save Changes</button>
            <button type="button" id="closeModal">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
`

// State management
let currentFlashcards: Flashcard[] = []
let currentStudyIndex = 0

// DOM Elements
const flashcardForm = document.getElementById('flashcardForm') as HTMLFormElement
const flashcardsList = document.getElementById('flashcardsList')!
const categoriesSelect = document.getElementById('categories') as HTMLSelectElement
const startStudyButton = document.getElementById('startStudy')!
const flipCardButton = document.getElementById('flipCard')!
const nextCardButton = document.getElementById('nextCard')!
const cardFront = document.querySelector('.card-front')!
const cardBack = document.querySelector('.card-back')!

// New DOM elements for Create Modal
const showCreateModalButton = document.getElementById('showCreateModalButton')!
const createModal = document.getElementById('createModal')!
const closeCreateModalButton = document.getElementById('closeCreateModal')!

// New DOM elements for Study Modal
const studyModal = document.getElementById('studyModal')!
const closeStudyModalButton = document.getElementById('closeStudyModal')!

// Load categories
async function loadCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error loading categories:', error)
    return
  }

  // currentCategories = data
  const categoryOptions = data
    .map(category => `<option value="${category.id}">${category.name}</option>`)
    .join('')
  
  // Update both category selectors
  categoriesSelect.innerHTML = categoryOptions
  const editCategories = document.getElementById('editCategories') as HTMLSelectElement
  editCategories.innerHTML = categoryOptions
}

// Load flashcards
async function loadFlashcards() {
  const { data, error } = await supabase
    .from('flashcards')
    .select(`
      *,
      flashcard_categories (
        category_id,
        categories (
          name
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading flashcards:', error)
    return
  }

  currentFlashcards = data
  renderFlashcards()
}

// Render flashcards
function renderFlashcards() {
  if (currentFlashcards.length === 0) {
    flashcardsList.innerHTML = '<p>No flashcards created yet. Create one above!</p>';
    return;
  }

  const tableHeader = `
    <thead>
      <tr>
        <th>Image</th>
        <th>Question</th>
        <th>Answer</th>
        <th>Categories</th>
        <th>Actions</th>
      </tr>
    </thead>
  `;

  const tableBody = currentFlashcards
    .map(flashcard => `
      <tr>
        <td>
          ${flashcard.image_url ? `<img src="${flashcard.image_url}" alt="Flashcard image thumbnail" class="flashcard-thumbnail">` : 'No image'}
        </td>
        <td>${flashcard.question}</td>
        <td>${flashcard.answer}</td>
        <td>
          ${flashcard.flashcard_categories
            .map(fc => `<span class="category-tag-table">${fc.categories.name}</span>`)
            .join('')}
        </td>
        <td>
          <div class="flashcard-actions-table">
            <button onclick="editFlashcard(${flashcard.id})">Edit</button>
            <button onclick="deleteFlashcard(${flashcard.id})">Delete</button>
          </div>
        </td>
      </tr>
    `)
    .join('');

  flashcardsList.innerHTML = `<table class="flashcards-table">${tableHeader}<tbody>${tableBody}</tbody></table>`;
}

// Create new flashcard
async function createFlashcard(event: Event) {
  event.preventDefault()
  
  const form = event.target as HTMLFormElement
  const question = (form.querySelector('#question') as HTMLTextAreaElement).value
  const answer = (form.querySelector('#answer') as HTMLTextAreaElement).value
  const imageUrl = (form.querySelector('#imageUrl') as HTMLInputElement).value
  const selectedCategories = Array.from(categoriesSelect.selectedOptions).map(option => Number(option.value))

  const { data: flashcard, error } = await supabase
    .from('flashcards')
    .insert([{ question, answer, image_url: imageUrl || null }])
    .select()
    .single()

  if (error) {
    console.error('Error creating flashcard:', error)
    return
  }

  // Add categories
  if (selectedCategories.length > 0) {
    const { error: categoryError } = await supabase
      .from('flashcard_categories')
      .insert(
        selectedCategories.map(categoryId => ({
          flashcard_id: flashcard.id,
          category_id: categoryId
        }))
      )

    if (categoryError) {
      console.error('Error adding categories:', categoryError)
    }
  }

  form.reset()
  closeCreateModal() // Close modal after creation
  loadFlashcards()
}

// Delete flashcard
async function deleteFlashcard(id: number) {
  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting flashcard:', error)
    return
  }

  loadFlashcards()
}

// Study mode functions
function startStudySession() {
  if (currentFlashcards.length === 0) {
    alert('No flashcards available to study!')
    return
  }

  // studyMode = true
  currentStudyIndex = 0
  studyModal.classList.remove('hidden') // Show the modal
  showCurrentCard()
}

function showCurrentCard() {
  const flashcard = currentFlashcards[currentStudyIndex]
  const imageHtml = flashcard.image_url ? `<img src="${flashcard.image_url}" alt="Flashcard image">` : ''
  
  // Front of the card shows question
  cardFront.innerHTML = `
    <div class="study-question">
      <p>${flashcard.question}</p>
      ${imageHtml}
    </div>
  `
  
  // Back of the card shows answer
  cardBack.innerHTML = `
    <div class="study-answer">
      <p>${flashcard.answer}</p>
      ${imageHtml}
    </div>
  `

  // Reset the card to front side
  const card = document.querySelector('.card')!
  card.classList.remove('flipped')
}

function flipCard() {
  const card = document.querySelector('#studyModal .card')! // ensure we target the card in the study modal
  card.classList.toggle('flipped')

  // Speak the answer if the card is flipped to the back
  if (card.classList.contains('flipped') && currentFlashcards.length > 0) {
    const answerText = currentFlashcards[currentStudyIndex].answer
    if (answerText) {
      const utterance = new SpeechSynthesisUtterance(answerText)
      // You can customize voice, rate, pitch etc. here if needed
      // For example: utterance.lang = 'es-ES';
      speechSynthesis.speak(utterance)
    } else {
      // Optionally, speak a message if there's no answer text
      // const noAnswerUtterance = new SpeechSynthesisUtterance("No answer provided.");
      // speechSynthesis.speak(noAnswerUtterance);
    }
  } else {
    // If flipped back to front, or no flashcards, cancel any ongoing speech
    speechSynthesis.cancel()
  }
}

async function nextCard() {
  // Record view
  const currentFlashcard = currentFlashcards[currentStudyIndex]
  await supabase
    .from('flashcard_views')
    .insert([{ flashcard_id: currentFlashcard.id }])

  // Move to next card
  currentStudyIndex = (currentStudyIndex + 1) % currentFlashcards.length
  showCurrentCard()
}

// Event listeners
flashcardForm.addEventListener('submit', createFlashcard)
startStudyButton.addEventListener('click', startStudySession)
flipCardButton.addEventListener('click', flipCard)
nextCardButton.addEventListener('click', nextCard)

// Event listeners for Create Modal
showCreateModalButton.addEventListener('click', () => {
  createModal.classList.remove('hidden')
})

closeCreateModalButton.addEventListener('click', () => {
  closeCreateModal() 
})

function closeCreateModal() {
  createModal.classList.add('hidden')
  flashcardForm.reset() // Optionally reset form when closing with cancel
}

// Event listeners for Study Modal
closeStudyModalButton.addEventListener('click', () => {
  closeStudyModalFunction()
})

function closeStudyModalFunction() {
  studyModal.classList.add('hidden')
  // studyMode = false
  // Optionally, clear the card content when closing
  cardFront.innerHTML = ''
  cardBack.innerHTML = ''
  const card = document.querySelector('#studyModal .card')! // ensure we target the card in the study modal
  card.classList.remove('flipped')
}

// Make deleteFlashcard available globally
;(window as any).deleteFlashcard = deleteFlashcard

// Add edit functionality
async function editFlashcard(id: number) {
  const flashcard = currentFlashcards.find(f => f.id === id)
  if (!flashcard) return

  // Populate edit form
  const editId = document.getElementById('editId') as HTMLInputElement
  const editQuestion = document.getElementById('editQuestion') as HTMLTextAreaElement
  const editAnswer = document.getElementById('editAnswer') as HTMLTextAreaElement
  const editImageUrl = document.getElementById('editImageUrl') as HTMLInputElement
  const editCategories = document.getElementById('editCategories') as HTMLSelectElement

  editId.value = id.toString()
  editQuestion.value = flashcard.question
  editAnswer.value = flashcard.answer
  editImageUrl.value = flashcard.image_url || ''
  
  // Set selected categories
  const selectedCategoryIds = flashcard.flashcard_categories.map(fc => fc.category_id)
  Array.from(editCategories.options).forEach(option => {
    option.selected = selectedCategoryIds.includes(Number(option.value))
  })

  // Show modal
  const modal = document.getElementById('editModal')!
  modal.classList.remove('hidden')
}

// Handle edit form submission
async function handleEdit(event: Event) {
  event.preventDefault()
  
  const form = event.target as HTMLFormElement
  const id = Number((form.querySelector('#editId') as HTMLInputElement).value)
  const question = (form.querySelector('#editQuestion') as HTMLTextAreaElement).value
  const answer = (form.querySelector('#editAnswer') as HTMLTextAreaElement).value
  const imageUrl = (form.querySelector('#editImageUrl') as HTMLInputElement).value
  const selectedCategories = Array.from(
    (form.querySelector('#editCategories') as HTMLSelectElement).selectedOptions
  ).map(option => Number(option.value))

  // Update flashcard
  const { error } = await supabase
    .from('flashcards')
    .update({ 
      question, 
      answer, 
      image_url: imageUrl || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating flashcard:', error)
    return
  }

  // Update categories
  // First, delete existing categories
  await supabase
    .from('flashcard_categories')
    .delete()
    .eq('flashcard_id', id)

  // Then, add new categories
  if (selectedCategories.length > 0) {
    const { error: categoryError } = await supabase
      .from('flashcard_categories')
      .insert(
        selectedCategories.map(categoryId => ({
          flashcard_id: id,
          category_id: categoryId
        }))
      )

    if (categoryError) {
      console.error('Error updating categories:', categoryError)
    }
  }

  // Close modal and refresh flashcards
  closeModal()
  loadFlashcards()
}

// Close modal
function closeModal() {
  const modal = document.getElementById('editModal')!
  modal.classList.add('hidden')
  const form = document.getElementById('editForm') as HTMLFormElement
  form.reset()
}

// Add event listeners for edit functionality
const editForm = document.getElementById('editForm')!
const closeModalButton = document.getElementById('closeModal')!

editForm.addEventListener('submit', handleEdit)
closeModalButton.addEventListener('click', closeModal)

// Make editFlashcard available globally
;(window as any).editFlashcard = editFlashcard

// Initialize
loadCategories()
loadFlashcards()




