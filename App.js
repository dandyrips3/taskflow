import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeWorkspace, setActiveWorkspace] = useState('Colegio'); 
  
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  // --- Estados Tareas ---
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('');
  const [days, setDays] = useState('');
  const [importance, setImportance] = useState('Alta');

  // --- Estados Radar de Suscripciones ---
  const [isRadarMode, setIsRadarMode] = useState(false); 
  const [subscriptions, setSubscriptions] = useState([]);
  const [subService, setSubService] = useState('');
  const [subClient, setSubClient] = useState('');
  const [subDays, setSubDays] = useState('');

  useEffect(() => {
    loadData();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    await Notifications.requestPermissionsAsync();
  };

  const loadData = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem('tasks');
      const storedCompleted = await AsyncStorage.getItem('completedTasks');
      const storedWebhook = await AsyncStorage.getItem('webhookUrl');
      const storedSubs = await AsyncStorage.getItem('subscriptions');
      
      if (storedTasks) setTasks(JSON.parse(storedTasks));
      if (storedCompleted) setCompletedTasks(JSON.parse(storedCompleted));
      if (storedWebhook) setWebhookUrl(storedWebhook);
      if (storedSubs) setSubscriptions(JSON.parse(storedSubs));
    } catch (e) {
      console.error(e);
    }
  };

  const saveData = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  };

  const notifyDiscord = async (content) => {
    if (!webhookUrl) return;
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
    } catch (e) {
      console.log('Error enviando al Webhook');
    }
  };

  const addTask = async () => {
    if (!subject || !type || !days) return Alert.alert('Error', 'Llena todos los datos de la tarea.');

    const newTask = {
      id: Date.now().toString(), 
      subject, type, days: parseInt(days), 
      importance, workspace: activeWorkspace, completed: false,
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    saveData('tasks', updatedTasks);
    
    if (newTask.days <= 1) {
      notifyDiscord(`⚡ **ALERTA TASKFLOW [${newTask.workspace}]** ⚡\nQuedan ${newTask.days} días (o menos) para: **${newTask.subject}**.\nPrioridad: ${newTask.importance}`);
    }

    setSubject(''); setType(''); setDays(''); setImportance('Alta');
    setActiveTab('tasks');
  };

  const addSubscription = async () => {
    if (!subService || !subClient || !subDays) return Alert.alert('Error', 'Llena los datos del radar.');

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + parseInt(subDays));

    const newSub = {
      id: Date.now().toString(),
      service: subService,
      client: subClient,
      expiresAt: targetDate.getTime(),
    };

    const updatedSubs = [...subscriptions, newSub];
    setSubscriptions(updatedSubs);
    saveData('subscriptions', updatedSubs);

    setSubService(''); setSubClient(''); setSubDays('');
    setActiveTab('tasks'); // Ahora te manda a la lista de tareas para ver el radar
  };

  const completeTask = async (task) => {
    const updatedTasks = tasks.filter(t => t.id !== task.id);
    const updatedCompleted = [{...task, completedAt: new Date().toLocaleDateString()}, ...completedTasks];
    setTasks(updatedTasks); setCompletedTasks(updatedCompleted);
    saveData('tasks', updatedTasks); saveData('completedTasks', updatedCompleted);
  };

  const removeSubscription = async (id) => {
    const updatedSubs = subscriptions.filter(s => s.id !== id);
    setSubscriptions(updatedSubs);
    saveData('subscriptions', updatedSubs);
  };

  const saveWebhook = (text) => {
    setWebhookUrl(text); saveData('webhookUrl', text);
  };

  const getImportanceColor = (imp) => {
    if (imp === 'Alta') return '#FF2A2A'; 
    if (imp === 'Media') return '#FFC000'; 
    return '#00FFA3'; 
  };

  const getDaysLeft = (timestamp) => {
    const diffTime = timestamp - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getRadarColor = (daysLeft) => {
    if (daysLeft <= 3) return '#FF2A2A'; 
    if (daysLeft <= 7) return '#FFC000'; 
    return '#00FFA3'; 
  };

  // --- VISTAS ---

  const renderHomeView = () => {
    const colegioTasks = tasks.filter(t => t.workspace === 'Colegio').length;
    const shopTasks = tasks.filter(t => t.workspace === 'Vyce Services').length;

    return (
      <ScrollView style={styles.viewContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.viewTitle}>Overview</Text>
        
        <View style={styles.bentoGrid}>
          <View style={[styles.bentoBox, styles.bentoLarge]}>
            <Feather name="activity" size={28} color="#00F0FF" style={{marginBottom: 10}} />
            <Text style={styles.bentoNumber}>{tasks.length}</Text>
            <Text style={styles.bentoLabel}>Pendientes Totales</Text>
          </View>
          
          <View style={styles.bentoColumn}>
            <View style={[styles.bentoBox, styles.bentoSmall, {marginBottom: 10}]}>
              <Text style={[styles.bentoNumber, {fontSize: 24, color: '#FF9F0A'}]}>{colegioTasks}</Text>
              <Text style={styles.bentoLabel}>Colegio</Text>
            </View>
            <View style={[styles.bentoBox, styles.bentoSmall]}>
              <Text style={[styles.bentoNumber, {fontSize: 24, color: '#B026FF'}]}>{shopTasks}</Text>
              <Text style={styles.bentoLabel}>Vyce Services</Text>
            </View>
          </View>
        </View>

        <View style={[styles.premiumCard, {marginTop: 20, marginBottom: 40}]}>
          <View style={styles.cardHeader}>
            <Feather name="cpu" size={20} color="#00F0FF" />
            <Text style={styles.premiumCardTitle}>Webhook de Alertas (Discord)</Text>
          </View>
          <TextInput 
            style={styles.premiumInput} 
            placeholder="URL del Webhook de servidor..." 
            placeholderTextColor="#444" 
            value={webhookUrl} onChangeText={saveWebhook} 
          />
        </View>
      </ScrollView>
    );
  };

  const renderAddView = () => (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.viewContainer}>
      <Text style={styles.viewTitle}>Nueva Entrada</Text>
      
      <View style={styles.workspaceSelector}>
        <TouchableOpacity style={[styles.wsBtn, activeWorkspace === 'Colegio' && styles.wsBtnActive]} onPress={() => {setActiveWorkspace('Colegio'); setIsRadarMode(false);}}>
          <Feather name="book" size={16} color={activeWorkspace === 'Colegio' ? '#000' : '#888'} style={{marginRight: 6}} />
          <Text style={[styles.wsBtnText, activeWorkspace === 'Colegio' && styles.wsBtnTextActive]}>Colegio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.wsBtn, activeWorkspace === 'Vyce Services' && styles.wsBtnActive]} onPress={() => setActiveWorkspace('Vyce Services')}>
          <Feather name="briefcase" size={16} color={activeWorkspace === 'Vyce Services' ? '#000' : '#888'} style={{marginRight: 6}} />
          <Text style={[styles.wsBtnText, activeWorkspace === 'Vyce Services' && styles.wsBtnTextActive]}>Vyce Services</Text>
        </TouchableOpacity>
      </View>

      {activeWorkspace === 'Vyce Services' && (
        <View style={styles.subSelector}>
          <TouchableOpacity style={[styles.subBtn, !isRadarMode && styles.subBtnActive]} onPress={() => setIsRadarMode(false)}>
            <Text style={[styles.subBtnText, !isRadarMode && styles.subBtnTextActive]}>Tarea/Pedido</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.subBtn, isRadarMode && styles.subBtnActive]} onPress={() => setIsRadarMode(true)}>
            <Text style={[styles.subBtnText, isRadarMode && styles.subBtnTextActive]}>Radar (Key/Sub)</Text>
          </TouchableOpacity>
        </View>
      )}

      {isRadarMode && activeWorkspace === 'Vyce Services' ? (
        <View style={[styles.premiumCard, { borderColor: '#00F0FF' }]}>
          <TextInput style={styles.premiumInput} placeholder="Servicio (ej. Discord Nitro, Spotify Premium)" placeholderTextColor="#444" value={subService} onChangeText={setSubService} />
          <TextInput style={styles.premiumInput} placeholder="Cliente o Socio (ej. Vuled, Roza, Personal)" placeholderTextColor="#444" value={subClient} onChangeText={setSubClient} />
          <TextInput style={styles.premiumInput} placeholder="Vigencia (Días totales de la key/sub)" placeholderTextColor="#444" keyboardType="numeric" value={subDays} onChangeText={setSubDays} />
          
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#00F0FF' }]} onPress={addSubscription}>
            <Text style={styles.actionBtnText}>Añadir al Radar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.premiumCard}>
          <TextInput style={styles.premiumInput} placeholder={activeWorkspace === 'Colegio' ? "Materia (ej. Física)" : "Cliente o Pedido"} placeholderTextColor="#444" value={subject} onChangeText={setSubject} />
          <TextInput style={styles.premiumInput} placeholder={activeWorkspace === 'Colegio' ? "Tipo (ej. Informe de Lab)" : "Detalle (ej. Server Boosts)"} placeholderTextColor="#444" value={type} onChangeText={setType} />
          <TextInput style={styles.premiumInput} placeholder="Plazo de entrega (Días)" placeholderTextColor="#444" keyboardType="numeric" value={days} onChangeText={setDays} />
          
          <Text style={styles.premiumLabel}>Nivel de Prioridad</Text>
          <View style={styles.chipsContainer}>
            {['Alta', 'Media', 'Baja'].map(imp => (
              <TouchableOpacity key={imp} style={[styles.chip, importance === imp && { borderColor: getImportanceColor(imp), backgroundColor: `${getImportanceColor(imp)}15` }]} onPress={() => setImportance(imp)}>
                <Text style={[styles.chipText, importance === imp && { color: getImportanceColor(imp) }]}>{imp}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={addTask}>
            <Text style={styles.actionBtnText}>Desplegar Tarea</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  const renderTasksView = () => {
    const sortedSubs = [...subscriptions].sort((a, b) => a.expiresAt - b.expiresAt);

    // Componente del Radar que solo se renderiza si estamos en Vyce Services y no en el Archivo
    const renderRadarSection = () => {
      if (activeWorkspace !== 'Vyce Services' || showCompleted) return null;

      return (
        <View style={[styles.radarContainer, { marginTop: 0, marginBottom: 20 }]}>
          <View style={styles.cardHeader}>
            <Feather name="radio" size={20} color="#00F0FF" />
            <Text style={styles.premiumCardTitle}>Radar de Suscripciones</Text>
          </View>
          
          {sortedSubs.length === 0 ? (
            <Text style={styles.emptyTextSub}>No hay suscripciones activas en el radar.</Text>
          ) : (
            sortedSubs.map(sub => {
              const daysLeft = getDaysLeft(sub.expiresAt);
              const radarColor = getRadarColor(daysLeft);
              return (
                <View key={sub.id} style={styles.radarItem}>
                  <View style={[styles.radarIndicator, { backgroundColor: radarColor, shadowColor: radarColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.radarService}>{sub.service}</Text>
                    <Text style={styles.radarClient}>{sub.client}</Text>
                  </View>
                  <View style={styles.radarBadge}>
                    <Text style={[styles.radarDaysText, { color: radarColor }]}>
                      {daysLeft < 0 ? 'Vencido' : `${daysLeft}d`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeSubscription(sub.id)} style={styles.deleteSubBtn}>
                    <Feather name="x" size={16} color="#444" />
                  </TouchableOpacity>
                </View>
              )
            })
          )}
        </View>
      );
    };

    return (
      <View style={styles.viewContainer}>
        <View style={styles.headerRowList}>
          <Text style={styles.viewTitle}>{showCompleted ? 'Archivo' : 'Flujo'}</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowCompleted(!showCompleted)}>
            <Feather name={showCompleted ? 'layers' : 'archive'} size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={[styles.workspaceSelector, {marginBottom: 20}]}>
          <TouchableOpacity style={[styles.wsBtn, activeWorkspace === 'Colegio' && styles.wsBtnActive]} onPress={() => setActiveWorkspace('Colegio')}>
            <Text style={[styles.wsBtnText, activeWorkspace === 'Colegio' && styles.wsBtnTextActive]}>Colegio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.wsBtn, activeWorkspace === 'Vyce Services' && styles.wsBtnActive]} onPress={() => setActiveWorkspace('Vyce Services')}>
            <Text style={[styles.wsBtnText, activeWorkspace === 'Vyce Services' && styles.wsBtnTextActive]}>Vyce Services</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={showCompleted ? completedTasks.filter(t => t.workspace === activeWorkspace) : tasks.filter(t => t.workspace === activeWorkspace).sort((a,b)=>a.days-b.days)}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={renderRadarSection}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name={activeWorkspace === 'Colegio' ? "book-open" : "check-circle"} size={48} color="#222" style={{ marginBottom: 20 }} />
              <Text style={styles.emptyText}>Nada por aquí.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.taskItem, showCompleted && {opacity: 0.5}]}>
              <View style={[styles.glowBar, { backgroundColor: getImportanceColor(item.importance) }]} />
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{item.subject}</Text>
                <Text style={styles.taskSub}>{item.type}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{showCompleted ? item.completedAt : `${item.days} Días restantes`}</Text>
                </View>
              </View>
              {!showCompleted && (
                <TouchableOpacity style={styles.doneBtn} onPress={() => completeTask(item)}>
                  <Feather name="check" size={24} color="#00FFA3" />
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      </View>
    );
  };

  return (
    <View style={styles.appWrapper}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topNav}><Text style={styles.logo}>TaskFlow</Text></View>
      <View style={styles.mainContent}>
        {activeTab === 'home' && renderHomeView()}
        {activeTab === 'add' && renderAddView()}
        {activeTab === 'tasks' && renderTasksView()}
      </View>
      <View style={styles.glassNav}>
        <TouchableOpacity style={styles.navIcon} onPress={() => setActiveTab('add')}>
          <Feather name="plus" size={28} color={activeTab === 'add' ? '#00F0FF' : '#555'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navIcon} onPress={() => setActiveTab('home')}>
          <Feather name="grid" size={28} color={activeTab === 'home' ? '#00F0FF' : '#555'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navIcon} onPress={() => setActiveTab('tasks')}>
          <Feather name="list" size={28} color={activeTab === 'tasks' ? '#00F0FF' : '#555'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appWrapper: { flex: 1, backgroundColor: '#050505' },
  topNav: { paddingTop: 60, paddingBottom: 10, paddingHorizontal: 24 },
  logo: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  mainContent: { flex: 1, paddingHorizontal: 20 },
  viewContainer: { flex: 1, paddingTop: 10 },
  viewTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 20, letterSpacing: -0.5 },
  
  workspaceSelector: { flexDirection: 'row', backgroundColor: '#121212', borderRadius: 14, padding: 4, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  wsBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  wsBtnActive: { backgroundColor: '#fff' },
  wsBtnText: { color: '#888', fontWeight: '700', fontSize: 14 },
  wsBtnTextActive: { color: '#000' },

  subSelector: { flexDirection: 'row', marginBottom: 20, alignSelf: 'center', backgroundColor: '#1A1A1A', borderRadius: 10, padding: 3 },
  subBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  subBtnActive: { backgroundColor: '#2C2C2E' },
  subBtnText: { color: '#666', fontSize: 12, fontWeight: '700' },
  subBtnTextActive: { color: '#00F0FF' },

  bentoGrid: { flexDirection: 'row', height: 180 },
  bentoBox: { backgroundColor: '#121212', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#222', justifyContent: 'center' },
  bentoLarge: { flex: 1, marginRight: 10, alignItems: 'flex-start' },
  bentoColumn: { flex: 1 },
  bentoSmall: { flex: 1, alignItems: 'center' },
  bentoNumber: { fontSize: 36, fontWeight: '900', color: '#fff' },
  bentoLabel: { fontSize: 13, color: '#666', fontWeight: '600', marginTop: 4 },

  premiumCard: { backgroundColor: '#121212', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  premiumCardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  premiumInput: { backgroundColor: '#0A0A0A', color: '#fff', fontSize: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#222', marginBottom: 16 },
  premiumLabel: { color: '#666', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 },
  
  radarContainer: { backgroundColor: '#121212', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#222' },
  radarItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0A', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  radarIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 15, shadowOpacity: 0.8, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  radarService: { color: '#fff', fontSize: 15, fontWeight: '700' },
  radarClient: { color: '#666', fontSize: 12, marginTop: 2 },
  radarBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#1A1A1A', marginRight: 10 },
  radarDaysText: { fontSize: 12, fontWeight: '800' },
  deleteSubBtn: { padding: 5 },
  emptyTextSub: { color: '#444', fontStyle: 'italic', fontSize: 14 },

  chipsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  chip: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#222', backgroundColor: '#0A0A0A', marginHorizontal: 4, alignItems: 'center' },
  chipText: { color: '#555', fontWeight: '700', fontSize: 14 },
  
  actionBtn: { backgroundColor: '#fff', paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  actionBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },

  headerRowList: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  iconBtn: { padding: 12, backgroundColor: '#121212', borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  
  taskItem: { flexDirection: 'row', backgroundColor: '#121212', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222', overflow: 'hidden', alignItems: 'center', paddingRight: 16 },
  glowBar: { width: 4, height: '100%' },
  taskContent: { flex: 1, padding: 16 },
  taskTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  taskSub: { color: '#666', fontSize: 14, marginBottom: 10 },
  badge: { backgroundColor: '#222', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  
  doneBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#222', justifyContent: 'center', alignItems: 'center' },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#444', fontSize: 16, fontWeight: '600' },

  glassNav: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#0A0A0A', paddingTop: 20, paddingBottom: 40, borderTopWidth: 1, borderTopColor: '#222' },
  navIcon: { alignItems: 'center', paddingHorizontal: 20 }
});