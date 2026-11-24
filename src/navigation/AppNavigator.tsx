import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ReportsScreen } from '../features/admin/ReportsScreen';
import { CvScreen } from '../features/career/CvScreen';
import { JobFormScreen } from '../features/career/JobFormScreen';
import { JobsScreen } from '../features/career/JobsScreen';
import { BookDetailScreen } from '../features/study/BookDetailScreen';
import { BookFormScreen } from '../features/study/BookFormScreen';
import { BooksScreen } from '../features/study/BooksScreen';
import { GroupDetailScreen } from '../features/study/GroupDetailScreen';
import { GroupFormScreen } from '../features/study/GroupFormScreen';
import { GroupsScreen } from '../features/study/GroupsScreen';
import { NoteDetailScreen } from '../features/study/NoteDetailScreen';
import { NoteFormScreen } from '../features/study/NoteFormScreen';
import { NotesScreen } from '../features/study/NotesScreen';
import { MembersScreen } from '../features/admin/MembersScreen';
import { ChatScreen } from '../features/chat/ChatScreen';
import { ChatsScreen } from '../features/chat/ChatsScreen';
import { GroupChatInfoScreen } from '../features/chat/GroupChatInfoScreen';
import { NewGroupScreen } from '../features/chat/NewGroupScreen';
import { AddStoryScreen } from '../features/stories/AddStoryScreen';
import { EditProfileScreen } from '../features/profile/EditProfileScreen';
import { PrivacyScreen } from '../features/profile/PrivacyScreen';
import { StoryViewerScreen } from '../features/stories/StoryViewerScreen';
import { NewChatScreen } from '../features/chat/NewChatScreen';
import { LostFoundScreen } from '../features/campus/LostFoundScreen';
import { LostItemFormScreen } from '../features/campus/LostItemFormScreen';
import { LostRepliesScreen } from '../features/campus/LostRepliesScreen';
import { StudentCardScreen } from '../features/campus/StudentCardScreen';
import { AdminHomeScreen } from '../features/admin/AdminHomeScreen';
import { EventAttendeesScreen } from '../features/admin/EventAttendeesScreen';
import { PersonProfileScreen } from '../features/chat/PersonProfileScreen';
import { AlbumFormScreen } from '../features/photos/AlbumFormScreen';
import { AlbumScreen } from '../features/photos/AlbumScreen';
import { PhotoViewerScreen } from '../features/photos/PhotoViewerScreen';
import { MemberPickerScreen } from '../features/societies/MemberPickerScreen';
import { SocietyDetailScreen } from '../features/societies/SocietyDetailScreen';
import { SocietyFormScreen } from '../features/societies/SocietyFormScreen';
import { ComposerScreen } from '../features/feed/ComposerScreen';
import { FeedScreen } from '../features/feed/FeedScreen';
import { NotificationsScreen } from '../features/feed/NotificationsScreen';
import { PostDetailScreen } from '../features/feed/PostDetailScreen';
import { EventComposerScreen } from '../features/events/EventComposerScreen';
import { EventDetailScreen } from '../features/events/EventDetailScreen';
import { GuestApprovalsScreen } from '../features/events/GuestApprovalsScreen';
import { GuestPassScreen } from '../features/events/GuestPassScreen';
import { MyTicketsScreen } from '../features/events/MyTicketsScreen';
import { ScannerScreen } from '../features/events/ScannerScreen';
import { TicketScreen } from '../features/events/TicketScreen';
import { SearchScreen } from '../features/search/SearchScreen';
import { MainTabs } from './MainTabs';
import type { AppStackParamList } from './types';
import { useSessionServices } from './useSessionServices';

const Stack = createNativeStackNavigator<AppStackParamList>();

/** Navigation for an approved student: the five tabs plus the screens opened from them. */
export function AppNavigator() {
  useSessionServices();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Tabs" component={MainTabs} options={{ animation: 'fade' }} />
      <Stack.Screen name="PersonProfile" component={PersonProfileScreen} />
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Composer" component={ComposerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="Ticket" component={TicketScreen} />
      <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
      <Stack.Screen name="GuestPass" component={GuestPassScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="GuestApprovals" component={GuestApprovalsScreen} />
      <Stack.Screen name="EventComposer" component={EventComposerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Members" component={MembersScreen} />
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="EventAttendees" component={EventAttendeesScreen} />
      <Stack.Screen name="SocietyDetail" component={SocietyDetailScreen} />
      <Stack.Screen name="SocietyForm" component={SocietyFormScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="MemberPicker" component={MemberPickerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Album" component={AlbumScreen} />
      <Stack.Screen name="PhotoViewer" component={PhotoViewerScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="AlbumForm" component={AlbumFormScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="LostFound" component={LostFoundScreen} />
      <Stack.Screen name="LostItemForm" component={LostItemFormScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="LostReplies" component={LostRepliesScreen} />
      <Stack.Screen name="StudentCard" component={StudentCardScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Notes" component={NotesScreen} />
      <Stack.Screen name="NoteDetail" component={NoteDetailScreen} />
      <Stack.Screen name="NoteForm" component={NoteFormScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Books" component={BooksScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="BookForm" component={BookFormScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Groups" component={GroupsScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="GroupForm" component={GroupFormScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Jobs" component={JobsScreen} />
      <Stack.Screen name="JobForm" component={JobFormScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Cv" component={CvScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Chats" component={ChatsScreen} />
      <Stack.Screen name="NewChat" component={NewChatScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="NewGroup" component={NewGroupScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="GroupChatInfo" component={GroupChatInfoScreen} />
      <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ animation: 'fade', gestureDirection: 'vertical' }} />
      <Stack.Screen name="AddStory" component={AddStoryScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
    </Stack.Navigator>
  );
}
